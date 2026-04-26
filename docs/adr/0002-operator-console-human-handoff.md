# ADR 0002: Operator Console and Human Handoff

- Status: Proposed
- Date: 2026-04-26
- Scope: React console, live monitoring, AI escalation, operator WebRTC, Twilio Conference control

## Context

The desired operating model is not a fully autonomous voice bot. Operators should be able to watch AI-handled customer calls, see the transcript and AI state, and join the call when the AI requests help or the operator decides to intervene.

The current code has no frontend, no live event API, no operator identity, and no call-control model. Adding React alone solves only the display/configuration problem. Human voice takeover requires browser audio and telephony call control.

## Decision

Build the operator experience as a React + TypeScript console backed by a Fastify API. Use Twilio Voice JavaScript SDK for the operator softphone and Twilio Conference for multi-party call management.

The AI remains connected through the backend using Twilio Media Streams and OpenAI Realtime WebSocket. The operator joins through Twilio Voice SDK, which uses WebRTC between the browser and Twilio. Backend APIs control conference participants.

## Handoff States

```text
ai_active
  -> escalation_requested
  -> operator_ringing
  -> operator_joined
  -> ai_muted_or_removed
  -> human_active
  -> call_completed
```

Manual operator intervention can move directly from `ai_active` to `operator_ringing`.

## Console Capabilities

- Live call list with status, elapsed time, customer number, AI state, and escalation status.
- Transcript panel with user/AI turns and timing.
- VAD/realtime event panel for debugging speech start/stop, response creation, and interruptions.
- Assistant settings: instructions, first message, voice, model, transcription model, VAD profile.
- Knowledge/RAG management: upload, indexing status, active/inactive state, and source preview.
- Handoff controls: acknowledge escalation, join call, mute AI, remove AI, end operator leg, end call.

## Backend Capabilities

- REST APIs for settings, knowledge, session records, and Twilio access-token generation.
- Live event stream over WebSocket or SSE for call state and transcript updates.
- Twilio webhook signature verification.
- Twilio Conference participant APIs for join/mute/hold/remove operations.
- Audit log for settings changes and handoff actions.

## Security and Privacy

- The console must require authentication before exposing call logs or softphone tokens.
- Twilio Voice access tokens must be short-lived and scoped to an operator identity.
- Full transcripts and phone numbers should not be printed in production logs by default.
- Knowledge uploads need validation, size limits, and deletion/disable controls.

## Open Questions

- Which identity provider should protect the admin console for the first release?
- Should AI remain silently listening after operator takeover, or be removed from the conference?
- Is coaching mode required, where a supervisor/AI can speak to the operator without the customer hearing it?
- What persistence layer should store settings, knowledge metadata, transcripts, and audit logs?

## References

- Twilio Voice JavaScript SDK: https://www.twilio.com/docs/voice/client/javascript
- Twilio Voice SDK reference components: https://www.twilio.com/docs/voice/sdks/javascript/reference-components
- Twilio Voice Conference: https://www.twilio.com/docs/voice/conference
- OpenAI Realtime WebRTC: https://platform.openai.com/docs/guides/realtime-webrtc
