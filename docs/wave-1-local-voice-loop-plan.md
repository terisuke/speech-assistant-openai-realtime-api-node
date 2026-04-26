# Wave 1 Implementation Plan: Local Voice Loop

## Objective

Prove the current voice assistant can run locally with the existing OpenAI API key and a current/test Twilio route before changing the `050` phone number or deploying to Cloud Run.

Parent epic: #20  
Primary issues: #8, #9  
Related issues: #7, #10, #19

## Branching

- Base branch: `develop`
- Working branches: `feature/wave-1-*` or `fix/wave-1-*`
- Merge target: `develop`
- `main` remains release-only.

Both `main` and `develop` are protected. Changes must go through pull requests.

## Scope

### 1. Local Startup Baseline

- Fix runtime blockers in `index.js`, including duplicate imports and missing dependencies.
- Add clear npm scripts such as `npm run dev` and `npm run start`.
- Keep behavior equivalent to the prototype while making startup reliable.
- Validate `.env` loading and fail fast when `OPENAI_API_KEY` is missing.

### 2. Local HTTP/TwiML Smoke Tests

- Verify the root or health endpoint responds locally.
- Verify `/incoming-call` returns valid TwiML.
- Add a lightweight smoke command or documented manual check.
- Keep these tests independent of the real `050` number.

### 3. OpenAI Realtime Connectivity Check

- Confirm the existing API key can open a Realtime session.
- Move model names behind configuration.
- Prefer the current supported Realtime model, such as `gpt-realtime`, during implementation.
- Log connection failures clearly without printing secrets.

### 4. Twilio Media Streams Local Check

- Expose the local server with ngrok or equivalent.
- Point a test/current Twilio route to `/incoming-call`.
- Confirm `connected`, `start`, `media`, and `stop` stream events are received.
- Confirm at least one AI audio response can be sent back to Twilio.

### 5. Initial VAD and Logging Instrumentation

- Add observable logs for speech start/stop, response create/done, stream start/stop, and handoff-relevant events.
- Avoid full transcript and phone-number logging by default.
- Prepare config fields for VAD profile tuning, but keep deep tuning for the dedicated VAD issue.

## Out of Scope

- Do not switch the `050` number.
- Do not deploy to Cloud Run.
- Do not build the React console yet.
- Do not implement human handoff yet.
- Do not introduce a large architecture rewrite before the current loop is verified.

## Acceptance Criteria

- Local app starts from a documented command.
- `/incoming-call` returns valid TwiML.
- OpenAI Realtime connection succeeds with the configured model.
- A Twilio test/current call can reach the local server through ngrok.
- The call completes at least one customer-to-AI-to-customer audio turn.
- Logs show enough call lifecycle detail to debug failures without exposing secrets.

## Deliverables

1. Runtime startup fix PR.
2. Local smoke-test/documentation PR.
3. Realtime model/config PR.
4. Twilio local call validation notes.
5. Wave 1 completion comment on #20, #8, and #9.

## Risks

- Existing OpenAI key may not have Realtime access or sufficient quota.
- Twilio account/number configuration may not support the expected Media Stream path.
- Local ngrok URL changes can make webhook testing brittle.
- Current prototype may need small API-shape changes before `gpt-realtime` works.

## Next Wave Gate

Wave 2 can start only after Wave 1 proves a local end-to-end call. Wave 2 should then focus on TypeScript/config structure, OpenAI API refresh, and VAD profile implementation.
