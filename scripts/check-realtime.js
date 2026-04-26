import dotenv from 'dotenv';
import WebSocket from 'ws';

dotenv.config();

const {
    OPENAI_API_KEY,
    REALTIME_MODEL = 'gpt-realtime',
    REALTIME_CHECK_TIMEOUT_MS = '10000'
} = process.env;

if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is required.');
    process.exit(1);
}

const timeoutMs = Number(REALTIME_CHECK_TIMEOUT_MS);
const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`;
const redactSecrets = (message) => message.replace(/sk-[^\s.]+/g, 'sk-***');

const ws = new WebSocket(url, {
    headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
    }
});

const timeout = setTimeout(() => {
    console.error(`Realtime check timed out after ${timeoutMs}ms.`);
    ws.close();
    process.exit(1);
}, timeoutMs);

ws.on('open', () => {
    console.log(`ok - connected to OpenAI Realtime model ${REALTIME_MODEL}`);
});

ws.on('message', (data) => {
    const event = JSON.parse(data);
    if (event.type === 'session.created') {
        console.log('ok - received session.created');
        clearTimeout(timeout);
        ws.close();
    }

    if (event.type === 'error') {
        clearTimeout(timeout);
        const errorType = event.error?.type || 'unknown_error';
        const errorCode = event.error?.code || 'unknown_code';
        const errorMessage = redactSecrets(event.error?.message || 'No message returned');
        console.error(`not ok - OpenAI Realtime error: ${errorType} (${errorCode})`);
        console.error(errorMessage);
        ws.close();
        process.exit(1);
    }
});

ws.on('error', (error) => {
    clearTimeout(timeout);
    console.error(`not ok - WebSocket error: ${error.message}`);
    process.exit(1);
});

ws.on('close', (code) => {
    if (code !== 1000 && code !== 1005) {
        clearTimeout(timeout);
        console.error(`not ok - WebSocket closed with code ${code}`);
        process.exit(1);
    }
});
