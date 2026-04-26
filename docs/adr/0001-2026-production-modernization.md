# ADR 0001: 2026 Production Modernization

- Status: Proposed
- Date: 2026-04-26
- Supersedes: initial prototype-only deployment assumptions
- Scope: OpenAI Realtime, Twilio telephony, React admin UI, human handoff, Cloud Run deployment, Japanese `050` launch

## Context

The current repository is a single-file Node.js prototype. It accepts Twilio Voice calls, opens a bidirectional Media Stream WebSocket, forwards audio to the OpenAI Realtime API, and logs a post-call transcript extraction. That design proved the concept, but it does not yet support production operation.

The product now needs five capabilities:

1. Move from a Replit/ngrok-style workflow to a reproducible cloud deployment.
2. Add an operator UI for call monitoring, logs, assistant settings, and knowledge/RAG input.
3. Launch on a Japanese `050` phone number.
4. Tune VAD/noise handling so ambient noise does not trigger listening too aggressively.
5. Refresh stale OpenAI API/model usage and general code structure.

A sixth architectural requirement follows from the operator workflow: when the AI escalates a call, a human operator should be able to join from the React UI and talk to the customer directly.

## Decision

Modernize incrementally while keeping the phone number cutover last.

1. First restore and validate the current local call path with the existing OpenAI API key and Twilio test/current number. Do not move the `050` number until the end-to-end voice path is verified.
2. Keep the production phone-call path server-side: Twilio Voice -> Node/Fastify -> OpenAI Realtime over WebSocket. This is the right shape for PSTN/`050` calls.
3. Add React + TypeScript for the operator console. React owns monitoring, logs, assistant configuration, knowledge/RAG input, VAD profile selection, and handoff controls.
4. Add a backend event channel from server to React using WebSocket or SSE. It should stream call state, transcripts, AI events, VAD events, escalation requests, and operator actions.
5. Use Twilio Voice JavaScript SDK for browser-based human operator audio. This introduces WebRTC between the operator browser and Twilio, not between the customer phone and the browser directly.
6. Use Twilio Conference/call-control semantics for handoff. Prefer a conference-centered design where the customer, AI bridge, and human operator can be managed as participants. This enables join, mute, hold, remove, and potential coaching/monitoring behavior.
7. Use OpenAI Realtime `gpt-realtime` or the current supported realtime model at implementation time. Model, voice, transcription, VAD, and extraction settings must be configuration, not source-code constants.
8. Deploy the backend/admin service to Google Cloud Run. Cloud Run supports WebSockets, but long streams require explicit timeout, reconnect behavior, and no end-to-end HTTP/2. Secrets belong in Secret Manager.

## Target Architecture

```text
050 customer call
  -> Twilio Voice / Conference
  -> backend Twilio webhook + Media Stream WebSocket
  -> OpenAI Realtime WebSocket
  -> AI speech response back to Twilio

React operator console
  -> backend REST API for config, knowledge, sessions, logs
  -> backend event stream for live call state
  -> Twilio Voice JS SDK for operator WebRTC softphone
  -> Twilio Conference participant control through backend
```

## Rollout Order

1. Local baseline: fix startup blockers, validate OpenAI key, validate current Twilio/ngrok call path.
2. API refresh: update Realtime model/session shape, transcription settings, structured extraction, and config loading.
3. VAD tuning: add named profiles, noise reduction settings, speech event logging, and comparison tests.
4. React console: create authenticated UI for live call monitoring, logs, assistant settings, VAD profile, and knowledge input.
5. Handoff: implement AI escalation events, operator notification, Twilio Voice SDK browser softphone, and Conference participant controls.
6. Cloud Run: containerize, wire Secret Manager, configure WebSocket timeout/reconnect posture, and add deployment docs.
7. Japanese launch: switch the `050` number webhook to Cloud Run only after the verified production URL is stable.

## Acceptance Criteria

- A local test call works before cloud deployment starts.
- All model names and realtime/session/VAD settings are configurable.
- React can show live call state and transcript updates.
- Operators can receive an AI escalation request and join the customer call from the browser.
- Cloud Run deployment can handle Twilio WebSocket traffic for expected call duration.
- The `050` number is switched only after Cloud Run, Twilio webhook verification, and Japanese call-flow tests pass.

## Consequences

- This is a larger refactor than updating model strings, but it preserves the safest launch order.
- Browser WebRTC is introduced for human operators, while server WebSockets remain the phone AI path.
- Conference-based handoff adds Twilio complexity but avoids brittle one-off call transfer behavior.
- The admin/RAG layer requires authentication, persistence, audit logging, and privacy controls.

## References

- OpenAI Realtime model: https://developers.openai.com/api/docs/models/gpt-realtime
- OpenAI Realtime VAD: https://developers.openai.com/api/docs/guides/realtime-vad
- OpenAI Realtime WebRTC: https://platform.openai.com/docs/guides/realtime-webrtc
- Google Cloud Run WebSockets: https://docs.cloud.google.com/run/docs/triggering/websockets
- Google Cloud Run secrets: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Twilio Media Streams: https://www.twilio.com/docs/voice/media-streams
- Twilio Voice JavaScript SDK: https://www.twilio.com/docs/voice/client/javascript
- Twilio Voice Conference: https://www.twilio.com/docs/voice/conference
