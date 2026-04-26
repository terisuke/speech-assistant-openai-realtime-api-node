# Wave 1 Verification ToE

ToE means test evidence for the Wave 1 local voice loop. Use this document to reproduce and record the minimum proof that the current Twilio -> local Node -> OpenAI Realtime -> Twilio path works before Cloud Run or permanent `050` number cutover.

## Scope

This verifies:

- Local server startup.
- Local HTTP and TwiML endpoints.
- OpenAI Realtime GA WebSocket session creation and `session.update`.
- Twilio Media Streams-compatible WebSocket audio return path.
- Temporary real `050` inbound call through ngrok.

This does not verify Cloud Run, React operator UI, RAG, human handoff, or production webhook signature validation.

## Prerequisites

- Node.js 22 or compatible Node runtime.
- Valid `.env` with `OPENAI_API_KEY`.
- Twilio CLI logged in and active.
- ngrok configured.
- Access to the Twilio `050` number.

Confirm Twilio profile and numbers:

```bash
twilio profiles:list
twilio api:core:incoming-phone-numbers:list --properties sid,phoneNumber,friendlyName,voiceUrl,voiceMethod --limit 20
```

Known Wave 1 test number:

```text
+815017929351
```

## Local Checks

Install and run syntax checks:

```bash
npm ci
npm test
```

Expected:

```text
node --check index.js
```

Start the local server:

```bash
npm run start
```

In a second terminal, verify local endpoints:

```bash
SMOKE_BASE_URL=http://127.0.0.1:5050 npm run smoke:local
```

Expected:

```text
ok - root endpoint
ok - health endpoint
ok - incoming-call TwiML
```

## OpenAI Realtime Check

```bash
npm run check:realtime
```

Expected:

```text
ok - connected to OpenAI Realtime model gpt-realtime-1.5
ok - received session.created
ok - session.update accepted
```

## Local Media Stream Check

With the local server still running:

```bash
npm run smoke:media-stream
```

Expected:

```text
ok - connected to local media stream WebSocket
ok - received outbound media payload from server
```

This confirms that a Twilio Media Streams-compatible client can connect and receive an outbound audio payload generated through OpenAI Realtime.

## ngrok Public Endpoint Check

Start ngrok:

```bash
ngrok http 5050
```

Fetch the public URL:

```bash
curl -s http://127.0.0.1:4040/api/tunnels
```

Set:

```bash
export NGROK_URL=https://your-ngrok-host.ngrok-free.app
```

Verify public endpoints:

```bash
curl -sS -i "$NGROK_URL/healthz"
curl -sS -i -X POST "$NGROK_URL/incoming-call"
```

Expected:

- `/healthz` returns HTTP 200 and `{"status":"ok"}`.
- `/incoming-call` returns TwiML with `wss://.../media-stream`.

## Temporary `050` Call Test

Record the current webhook before changing it:

```bash
twilio api:core:incoming-phone-numbers:list --properties sid,phoneNumber,voiceUrl,voiceMethod --limit 20
```

Temporarily point the `050` number to ngrok:

```bash
twilio api:core:incoming-phone-numbers:update \
  --sid PNd8122ab1cccb51d2ae53fca20eeb5a02 \
  --voice-url "$NGROK_URL/incoming-call" \
  --voice-method POST \
  --properties sid,phoneNumber,voiceUrl,voiceMethod
```

Call `050-1792-9351`.

Expected server logs:

```text
Incoming call
Client connected
Incoming stream has started ...
Connected to the OpenAI Realtime API
Received event: session.created
Received event: session.updated
Received event: input_audio_buffer.speech_started
Received event: input_audio_buffer.speech_stopped
Received event: conversation.item.input_audio_transcription.completed
Received event: response.output_audio_transcript.done
Received event: response.done
```

Evidence from the first successful run:

```text
transcript: こんにちは
transcript: どんなことがあなたできるんですか?
```

## Cleanup

Restore the previous webhook. During the first Wave 1 run, the restore target was:

```bash
twilio api:core:incoming-phone-numbers:update \
  --sid PNd8122ab1cccb51d2ae53fca20eeb5a02 \
  --voice-url https://demo.twilio.com/welcome/voice/ \
  --voice-method POST \
  --properties sid,phoneNumber,voiceUrl,voiceMethod
```

Stop local processes:

```bash
pkill -f "node index.js"
pkill -f "ngrok http 5050"
```

Confirm the number has been restored:

```bash
twilio api:core:incoming-phone-numbers:list --properties sid,phoneNumber,voiceUrl,voiceMethod --limit 20
```

## Pass Criteria

Wave 1 passes when:

- CI `Node checks` passes.
- `npm test` passes locally.
- `npm run check:realtime` passes.
- `npm run smoke:local` passes.
- `npm run smoke:media-stream` passes.
- A real `050` inbound call reaches OpenAI Realtime and receives audio back.
- The temporary Twilio webhook is restored after testing.
