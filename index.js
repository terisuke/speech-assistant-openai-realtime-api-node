import Fastify from 'fastify';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';

// .envファイルから環境変数を読み込む
dotenv.config();

// 環境変数からOpenAI APIキーを取得
const {
    OPENAI_API_KEY,
    PORT = 5050,
    REALTIME_MODEL = 'gpt-realtime-1.5',
    TRANSCRIPTION_MODEL = 'gpt-4o-transcribe',
    EXTRACTION_MODEL = 'gpt-5.4-mini',
    EXTRACTION_ENABLED = 'false',
    VOICE = 'marin',
    AUDIO_FORMAT = 'audio/pcmu',
    AUDIO_NOISE_REDUCTION = 'near_field',
    VAD_TYPE = 'server_vad',
    VAD_THRESHOLD = '0.65',
    VAD_PREFIX_PADDING_MS = '300',
    VAD_SILENCE_DURATION_MS = '700',
    VAD_EAGERNESS = 'low',
    LOG_TRANSCRIPTS = 'false',
    LOG_OPENAI_RESPONSES = 'false'
} = process.env;

if (!OPENAI_API_KEY) {
    console.error('OpenAI APIキーが見つかりません。.envファイルに設定してください。');
    process.exit(1);
}

// Fastifyを初期化
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

// 定数の設定
const SYSTEM_MESSAGE = 'ここにシステムメッセージを書く';
// 例：`あなたは居酒屋まほろばー の AI 受付係です。あなたの仕事は、飲食店を利用したい顧客と丁寧に対話し、名前、電話番号、来店予定日を入手することです。一度で 1 つずつ質問してください。会話はフレンドリーでプロフェッショナルなままであることを確認し、ユーザーがこれらの詳細を自然に提供できるように誘導します。相手は日本人なので、日本語以外の返答が返ってきた時は、日本語の返答が返ってくるまで質問を繰り返してください。';
const PORT_NUMBER = Number(PORT);
const SHOULD_LOG_TRANSCRIPTS = LOG_TRANSCRIPTS === 'true';
const SHOULD_RUN_EXTRACTION = EXTRACTION_ENABLED === 'true';
const SHOULD_LOG_OPENAI_RESPONSES = LOG_OPENAI_RESPONSES === 'true';
const buildTurnDetectionConfig = () => {
    if (VAD_TYPE === 'semantic_vad') {
        return {
            type: VAD_TYPE,
            eagerness: VAD_EAGERNESS,
            create_response: true,
            interrupt_response: true
        };
    }

    return {
        type: VAD_TYPE,
        threshold: Number(VAD_THRESHOLD),
        prefix_padding_ms: Number(VAD_PREFIX_PADDING_MS),
        silence_duration_ms: Number(VAD_SILENCE_DURATION_MS),
        create_response: true,
        interrupt_response: true
    };
};

const buildRealtimeSessionConfig = () => ({
    type: 'realtime',
    model: REALTIME_MODEL,
    instructions: SYSTEM_MESSAGE,
    audio: {
        input: {
            format: { type: AUDIO_FORMAT },
            noise_reduction: AUDIO_NOISE_REDUCTION === 'null' ? null : { type: AUDIO_NOISE_REDUCTION },
            transcription: {
                model: TRANSCRIPTION_MODEL
            },
            turn_detection: buildTurnDetectionConfig()
        },
        output: {
            format: { type: AUDIO_FORMAT },
            voice: VOICE
        }
    }
});

// セッション管理
const sessions = new Map();

// ログに出力するイベントタイプのリスト
const LOG_EVENT_TYPES = [
    'response.content.done',
    'rate_limits.updated',
    'response.done',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'session.created',
    'session.updated',
    'response.output_text.done',
    'response.output_audio_transcript.done',
    'conversation.item.input_audio_transcription.completed'
];

// ルート
fastify.get('/', async (request, reply) => {
    reply.send({ message: 'Twilio Media Stream Server is running!' });
});

fastify.get('/healthz', async (request, reply) => {
    reply.send({ status: 'ok' });
});

// Twilioが着信を処理するルート
fastify.all('/incoming-call', async (request, reply) => {
    console.log('Incoming call');

    // 固定の最初のメッセージを設定（必要に応じて変更してください）
    const firstMessage = '最初に言ってほしいことをここに書く';
    // 例：こんにちは、まほろばー店のAI受付係です。どのようにお手伝いできますか？

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
                              <Response>
                                  <Connect>
                                      <Stream url="wss://${request.headers.host}/media-stream" />
                                  </Connect>
                              </Response>`;

    reply.type('text/xml').send(twimlResponse);
});

// メディアストリーム用のWebSocketルート
fastify.register(async (fastify) => {
    fastify.get('/media-stream', { websocket: true }, (connection, req) => {
        console.log('Client connected');

        const sessionId = req.headers['x-twilio-call-sid'] || `session_${Date.now()}`;
        let session = sessions.get(sessionId) || { transcript: '', streamSid: null };
        sessions.set(sessionId, session);

        const openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`, {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`
            }
        });

        // 固定の最初のメッセージを設定
        const firstMessage = 'こんにちは、まほろばー店のAI受付係です。どのようにお手伝いできますか？';

        const sendSessionUpdate = () => {
            const sessionUpdate = {
                type: 'session.update',
                session: buildRealtimeSessionConfig()
            };

            console.log('Sending session update:', JSON.stringify(sessionUpdate));
            openAiWs.send(JSON.stringify(sessionUpdate));
        };

        // OpenAI WebSocketが開いたとき
        openAiWs.on('open', () => {
            console.log('Connected to the OpenAI Realtime API');
            setTimeout(() => {
                sendSessionUpdate();
                // 最初のメッセージをOpenAIに送信
                const queuedFirstMessage = {
                    type: 'conversation.item.create',
                    item: {
                        type: 'message',
                        role: 'user',
                        content: [{ type: 'input_text', text: firstMessage }]
                    }
                };
                openAiWs.send(JSON.stringify(queuedFirstMessage));
                // AIアシスタントに応答を促す
                openAiWs.send(JSON.stringify({ type: 'response.create' }));
            }, 250);
        });

        // OpenAI WebSocketからのメッセージを処理
        openAiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data);

                if (LOG_EVENT_TYPES.includes(response.type)) {
                    console.log(`Received event: ${response.type}`, response);
                }

                // ユーザーの音声認識結果を処理
                if (response.type === 'conversation.item.input_audio_transcription.completed') {
                    const userMessage = response.transcript.trim();
                    session.transcript += `User: ${userMessage}\n`;
                    if (SHOULD_LOG_TRANSCRIPTS) console.log(`User (${sessionId}): ${userMessage}`);
                }

                // エージェントの応答を処理
                if (response.type === 'response.done') {
                    const output = response.response.output || [];
                    const agentMessage = output
                        .flatMap(item => item.content || [])
                        .find(content => content.transcript || content.text)?.transcript || 'Agent message not found';
                    session.transcript += `Agent: ${agentMessage}\n`;
                    if (SHOULD_LOG_TRANSCRIPTS) console.log(`Agent (${sessionId}): ${agentMessage}`);
                }

                if (response.type === 'response.output_audio_transcript.done') {
                    const agentMessage = response.transcript || 'Agent message not found';
                    session.transcript += `Agent: ${agentMessage}\n`;
                    if (SHOULD_LOG_TRANSCRIPTS) console.log(`Agent (${sessionId}): ${agentMessage}`);
                }

                if (response.type === 'session.updated') {
                    console.log('Session updated successfully:', response);
                }

                if ((response.type === 'response.output_audio.delta' || response.type === 'response.audio.delta') && response.delta) {
                    const audioDelta = {
                        event: 'media',
                        streamSid: session.streamSid,
                        media: { payload: Buffer.from(response.delta, 'base64').toString('base64') }
                    };
                    connection.send(JSON.stringify(audioDelta));
                }
            } catch (error) {
                console.error('Error processing OpenAI message:', error, 'Raw message:', data);
            }
        });

        // Twilioからのメッセージを処理
        connection.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                switch (data.event) {
                    case 'media':
                        if (openAiWs.readyState === WebSocket.OPEN) {
                            const audioAppend = {
                                type: 'input_audio_buffer.append',
                                audio: data.media.payload
                            };

                            openAiWs.send(JSON.stringify(audioAppend));
                        }
                        break;
                    case 'start':
                        session.streamSid = data.start.streamSid;
                        console.log('Incoming stream has started', session.streamSid);
                        break;
                    default:
                        console.log('Received non-media event:', data.event);
                        break;
                }
            } catch (error) {
                console.error('Error parsing message:', error, 'Message:', message);
            }
        });

        // 接続が閉じられたときの処理
        connection.on('close', async () => {
            if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
            console.log(`Client disconnected (${sessionId}).`);
            if (SHOULD_LOG_TRANSCRIPTS) {
                console.log('Full Transcript:');
                console.log(session.transcript);
            }

            await processTranscriptAndSend(session.transcript, sessionId);

            // セッションのクリーンアップ
            sessions.delete(sessionId);
        });

        // OpenAI WebSocketのエラー処理
        openAiWs.on('close', () => {
            console.log('Disconnected from the OpenAI Realtime API');
        });

        openAiWs.on('error', (error) => {
            console.error('Error in the OpenAI WebSocket:', error);
        });
    });
});

// サーバーを起動
fastify.listen({ port: PORT_NUMBER }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server is listening on port ${PORT_NUMBER}`);
});

// ChatGPT APIを使用してトランスクリプトから情報を抽出
async function makeChatGPTCompletion(transcript) {
    console.log('Starting ChatGPT API call...');
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: EXTRACTION_MODEL,
                messages: [
                    { "role": "system", "content": "ここにシステムメッセージを書く" },
                    //例：以下のトランスクリプトから顧客の名前、電話番号、来店予定日を抽出してください。
                    { "role": "user", "content": transcript }
                ],
                response_format: {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "customer_details_extraction",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "customerName": { "type": "string" },
                                "customerPhoneNumber": { "type": "string" },
                                "visitDate": { "type": "string" }
                            },
                            "required": ["customerName", "customerPhoneNumber", "visitDate"]
                            //ここで必要な情報を指定できる
                        }
                    }
                }
            })
        });

        console.log('ChatGPT API response status:', response.status);
        const data = await response.json();
        if (SHOULD_LOG_OPENAI_RESPONSES) {
            console.log('Full ChatGPT API response:', JSON.stringify(data, null, 2));
        }
        return data;
    } catch (error) {
        console.error('Error making ChatGPT completion call:', error);
        throw error;
    }
}

// トランスクリプトを処理して結果をログに出力
async function processTranscriptAndSend(transcript, sessionId = null) {
    console.log(`Starting transcript processing for session ${sessionId}...`);
    if (!SHOULD_RUN_EXTRACTION) {
        console.log('Transcript extraction is disabled. Set EXTRACTION_ENABLED=true to enable it.');
        return;
    }

    if (!transcript.trim()) {
        console.log('Transcript is empty. Skipping extraction.');
        return;
    }

    try {
        // ChatGPT APIを呼び出す
        const result = await makeChatGPTCompletion(transcript);

        if (SHOULD_LOG_OPENAI_RESPONSES) {
            console.log('Raw result from ChatGPT:', JSON.stringify(result, null, 2));
        }

        if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
            try {
                const parsedContent = JSON.parse(result.choices[0].message.content);
                console.log('Parsed content:', JSON.stringify(parsedContent, null, 2));

                if (parsedContent) {
                    // 抽出した顧客情報をログに出力（必要に応じてデータベースに保存などの処理を追加できます）
                    console.log('Extracted customer details:', parsedContent);
                } else {
                    console.error('Unexpected JSON structure in ChatGPT response');
                }
            } catch (parseError) {
                console.error('Error parsing JSON from ChatGPT response:', parseError);
            }
        } else {
            console.error('Unexpected response structure from ChatGPT API');
        }

    } catch (error) {
        console.error('Error in processTranscriptAndSend:', error);
    }
}
