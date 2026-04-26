import WebSocket from 'ws';

const baseUrl = process.env.SMOKE_WS_URL || 'ws://127.0.0.1:5050/media-stream';
const timeoutMs = Number(process.env.MEDIA_STREAM_SMOKE_TIMEOUT_MS || '15000');
const callSid = `CA_SMOKE_${Date.now()}`;
const streamSid = `MZ_SMOKE_${Date.now()}`;

const ws = new WebSocket(baseUrl, {
    headers: {
        'x-twilio-call-sid': callSid
    }
});

const timeout = setTimeout(() => {
    console.error(`not ok - timed out after ${timeoutMs}ms waiting for outbound media`);
    ws.close();
    process.exit(1);
}, timeoutMs);

ws.on('open', () => {
    console.log('ok - connected to local media stream WebSocket');
    ws.send(JSON.stringify({
        event: 'connected',
        protocol: 'Call',
        version: '1.0.0'
    }));

    ws.send(JSON.stringify({
        event: 'start',
        sequenceNumber: '1',
        start: {
            accountSid: 'AC_SMOKE',
            streamSid,
            callSid,
            tracks: ['inbound'],
            mediaFormat: {
                encoding: 'audio/x-mulaw',
                sampleRate: 8000,
                channels: 1
            }
        },
        streamSid
    }));

    // 20ms of G.711 mu-law silence. This only primes the audio path; the
    // assistant's first response is triggered by the server-side text item.
    const silencePayload = Buffer.alloc(160, 0xff).toString('base64');
    ws.send(JSON.stringify({
        event: 'media',
        sequenceNumber: '2',
        streamSid,
        media: {
            track: 'inbound',
            chunk: '1',
            timestamp: '0',
            payload: silencePayload
        }
    }));
});

ws.on('message', (raw) => {
    const message = JSON.parse(raw);
    if (message.event === 'media' && message.media?.payload) {
        console.log('ok - received outbound media payload from server');
        clearTimeout(timeout);
        ws.close();
    }
});

ws.on('error', (error) => {
    clearTimeout(timeout);
    console.error(`not ok - WebSocket error: ${error.message}`);
    process.exit(1);
});

ws.on('close', () => {
    clearTimeout(timeout);
});
