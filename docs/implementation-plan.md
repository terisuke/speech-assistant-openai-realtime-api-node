# Implementation Plan

This plan turns the modernization ADRs into GitHub implementation epics and sub-issues.

## Principles

- Keep the `050` number cutover last.
- Validate the current local voice loop before cloud deployment.
- Keep PSTN voice traffic server-side with Twilio Media Streams and OpenAI Realtime WebSocket.
- Use React for the operator console and Twilio Voice SDK WebRTC for human operator participation.
- Treat settings, models, VAD, knowledge, and phone routing as configuration.

## Epic Structure

### Epic: 2026 Production Modernization

GitHub tracking issue: #20

Owns the full migration from prototype to production-ready voice assistant.

Sub-issues:

1. #8 Local baseline and smoke tests.
2. #6 TypeScript/backend module split.
3. #7 OpenAI Realtime API/model refresh.
4. #10 VAD and noise-reduction profiles.
5. #9 Twilio local/current-number validation.
6. #12 React operator console shell.
7. #11 Live call event stream and call-state store.
8. #14 Knowledge/RAG ingestion and retrieval.
9. #13 Twilio Voice SDK operator softphone.
10. #15 AI escalation detection and handoff workflow.
11. #17 Twilio Conference participant control.
12. #16 Cloud Run deployment and Secret Manager.
13. #19 Observability, privacy, and audit logs.
14. #18 Japanese `050` number cutover.

## Milestones

### Milestone 1: Local Voice Loop

- App starts locally without import/dependency errors.
- Existing OpenAI API key can create a realtime session.
- Existing/current Twilio number or test TwiML app can reach local ngrok endpoint.
- A call can complete one AI turn.

### Milestone 2: Modern Backend

- TypeScript project structure is in place.
- Config schema validates required secrets and model settings.
- Realtime session code uses supported model/session settings.
- VAD profiles are configurable and testable.

### Milestone 3: Operator Console

- React console is authenticated.
- Live call list and transcript panel receive backend events.
- Assistant settings and knowledge documents can be managed from UI.

### Milestone 4: Human Handoff

- AI can emit an escalation event.
- Operator receives notification in the console.
- Operator joins through Twilio Voice SDK.
- Backend can mute/remove AI and manage conference participants.

### Milestone 5: Production Launch

- Cloud Run service is deployed with Secret Manager.
- WebSocket timeout/reconnect posture is documented and tested.
- Webhook signature verification is enabled.
- `050` number points to the production Cloud Run URL.
- Japanese call-flow test passes.

## Initial Work Order

1. Fix local startup and dependency issues.
2. Add a minimal smoke-test script for `/`, `/incoming-call`, and Realtime connection configuration.
3. Update OpenAI Realtime model/session config behind environment variables.
4. Add VAD profile config and speech-event logging.
5. Introduce TypeScript structure without changing external behavior.
6. Add React console skeleton and backend session-event stream.
7. Add Twilio Voice SDK operator token endpoint and browser softphone proof of concept.
8. Move call flow to Conference-based handoff.
9. Deploy to Cloud Run staging.
10. Switch the `050` number after staging call tests pass.
