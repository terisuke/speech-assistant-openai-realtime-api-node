# ADR 0001: 2026 Modernization Plan

- Status: Proposed
- Date: 2026-04-26
- Scope: deployment, admin UI, Japanese telephony, VAD tuning, and OpenAI API/model refresh

## Context

The current repository is a single-file Node.js prototype (`index.js`) built around Fastify, Twilio Media Streams, and an older OpenAI Realtime preview model. It is useful as a proof of concept, but it is not yet shaped for production operation. The five active problems are:

1. Deployment is tied to a Replit-style local/ngrok workflow rather than a reproducible cloud runtime.
2. Prompt, first-message, voice, VAD, and knowledge/RAG settings are hard-coded instead of managed through a UI.
3. Telephony must move from the previous US-number assumption to a Japanese `050` number.
4. VAD is too sensitive to ambient noise and enters listening mode too easily.
5. OpenAI API usage, model names, and code structure are stale.

## Decision

Modernize in phases rather than patching the prototype in place.

1. Target Google Cloud Run for the voice gateway and admin API. Cloud Run supports WebSockets, but WebSocket streams are subject to request timeouts, so deployment must configure an explicit timeout, reconnect handling, and no end-to-end HTTP/2. Store OpenAI and telephony secrets in Secret Manager.
2. Split the project into a TypeScript backend and a small authenticated admin UI. The backend owns Twilio/OpenAI realtime sessions, configuration APIs, and knowledge ingestion. The UI manages assistant instructions, first message, voice, Japanese phone routing, VAD profile, and knowledge documents.
3. Treat the Japanese `050` number as configuration. Use the provider console/API to point incoming voice calls to the deployed `/incoming-call` HTTPS endpoint, and verify webhook signatures before processing production traffic.
4. Replace hard-coded `server_vad` defaults with named VAD profiles. Initial production profile should raise the activation threshold, increase silence duration, enable OpenAI audio noise reduction where supported, and collect transcript/audio-event logs for tuning. Evaluate `semantic_vad` for interruption reduction.
5. Move realtime speech sessions to `gpt-realtime` or the current supported Realtime model at implementation time. Move post-call structured extraction away from legacy chat-completions style where practical and use a current Responses/structured-output flow. Keep model names configurable.

## Implementation Plan

### Phase 0: Repository Baseline

- Add contributor guide and ADRs.
- Create GitHub issues for the five workstreams.
- Add basic CI for install, lint/typecheck, and tests before large refactors.

### Phase 1: Runtime & Configuration

- Convert to TypeScript with explicit modules: `server`, `realtime`, `telephony`, `config`, `knowledge`, and `admin`.
- Add schema-validated environment/config loading.
- Move assistant settings out of source code and into persisted configuration.

### Phase 2: Google Cloud Deployment

- Add `Dockerfile`, health endpoint, Cloud Run deploy notes, and Secret Manager wiring.
- Configure Cloud Run timeout for long voice streams and document reconnect behavior.
- Add production-safe logging that avoids leaking full transcripts by default.

### Phase 3: Admin UI & Knowledge/RAG

- Build an authenticated UI for assistant profile editing and knowledge uploads.
- Store knowledge metadata and ingestion status.
- Add retrieval into the assistant flow with traceable citations or source snippets for operator review.

### Phase 4: Japanese Telephony

- Configure the `050` number to use the Cloud Run `/incoming-call` endpoint.
- Validate inbound webhook origin/signature.
- Add Japanese call-flow test cases and operator-visible call/session logs.

### Phase 5: Realtime/VAD/API Refresh

- Update Realtime session shape and model defaults.
- Add VAD profiles, noise reduction, and tuning logs.
- Create a repeatable test script for noisy-room, silence, interruption, and long-call scenarios.

## Consequences

- The first production release will take longer than a small patch, but avoids carrying prototype assumptions into operations.
- Cloud Run is a good fit for the WebSocket bridge, but long calls require explicit timeout and reconnect decisions.
- The admin UI and RAG layer introduce authentication, persistence, and audit requirements.
- Japanese phone operation should be tested end-to-end with the actual `050` number before any customer-facing release.

## References

- OpenAI Realtime model: https://developers.openai.com/api/docs/models/gpt-realtime
- OpenAI Realtime VAD: https://developers.openai.com/api/docs/guides/realtime-vad
- OpenAI Realtime transcription/noise reduction: https://developers.openai.com/api/docs/guides/realtime-transcription
- Google Cloud Run WebSockets: https://docs.cloud.google.com/run/docs/triggering/websockets
- Google Cloud Run secrets: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Twilio Voice webhooks: https://www.twilio.com/docs/usage/webhooks/voice-webhooks
