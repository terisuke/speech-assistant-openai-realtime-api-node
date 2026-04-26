const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:5050';
const smokeUrl = new URL(baseUrl);

async function assertOk(name, check) {
    try {
        await check();
        console.log(`ok - ${name}`);
    } catch (error) {
        console.error(`not ok - ${name}`);
        console.error(error.message);
        process.exitCode = 1;
    }
}

await assertOk('root endpoint', async () => {
    const response = await fetch(`${baseUrl}/`);
    if (!response.ok) throw new Error(`Expected 2xx, got ${response.status}`);
    const body = await response.json();
    if (body.message !== 'Twilio Media Stream Server is running!') {
        throw new Error('Unexpected root response body');
    }
});

await assertOk('health endpoint', async () => {
    const response = await fetch(`${baseUrl}/healthz`);
    if (!response.ok) throw new Error(`Expected 2xx, got ${response.status}`);
    const body = await response.json();
    if (body.status !== 'ok') throw new Error('Unexpected health response body');
});

await assertOk('incoming-call TwiML', async () => {
    const response = await fetch(`${baseUrl}/incoming-call`, { method: 'POST' });
    if (!response.ok) throw new Error(`Expected 2xx, got ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/xml')) {
        throw new Error(`Expected text/xml content type, got ${contentType}`);
    }

    const body = await response.text();
    if (!body.includes('<Response>')) throw new Error('Missing TwiML Response');
    if (!body.includes('<Connect>')) throw new Error('Missing TwiML Connect');
    if (!body.includes(`<Stream url="wss://${smokeUrl.host}/media-stream"`)) {
        throw new Error('Missing expected Media Stream URL');
    }
});
