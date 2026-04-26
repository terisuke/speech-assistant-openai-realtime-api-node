# Repository Guidelines

## Project Structure & Module Organization

This is a small Node.js ESM application centered on `index.js`. It starts a Fastify server, handles Twilio Voice webhooks, bridges Twilio Media Streams to the OpenAI Realtime API, and processes transcripts after disconnect.

- `index.js`: main server, WebSocket bridge, session tracking, transcript extraction.
- `Readme.md`: setup and local testing instructions, currently written in Japanese.
- `.env.example`: required environment variable template.
- `package.json` / `package-lock.json`: npm metadata and locked dependency versions.
- No dedicated `src/`, `test/`, or asset directories exist yet.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `cp .env.example .env`: create local configuration, then set `OPENAI_API_KEY`.
- `node index.js`: run the Fastify server on `PORT` or `5050`.
- `ngrok http 5050`: expose the local server for Twilio webhook testing.
- `npm test`: currently a placeholder that exits with an error; update it when tests are added.

## Coding Style & Naming Conventions

Use modern JavaScript ESM syntax because `package.json` sets `"type": "module"`. Keep indentation at 4 spaces to match `index.js`. Prefer `const` for stable bindings and `let` only for reassigned state. Use camelCase for variables and functions, and uppercase names for constants such as `SYSTEM_MESSAGE`, `VOICE`, and `PORT`.

No formatter or linter is configured. Before adding broad style changes, introduce tooling deliberately in a separate change.

## Testing Guidelines

There is no test framework configured. For new behavior, add focused tests under `test/` with Node's built-in test runner or another explicitly configured framework. Name tests by behavior, for example `test/media-stream-session.test.js`. At minimum, manually verify startup with `node index.js`, the root health response, and a Twilio call through ngrok when touching WebSocket or TwiML behavior.

## Commit & Pull Request Guidelines

The existing history uses short informal messages (`first commit`, `for trial`), so there is no strict convention. Use concise imperative commit messages going forward, for example `Add transcript extraction validation`.

Pull requests should describe behavior changes, list manual test steps, mention required environment variables, and include logs or screenshots when changing call setup, ngrok/Twilio configuration, or API responses.

## Security & Configuration Tips

Never commit `.env` or real API keys. Keep `.env.example` limited to placeholder values. Avoid logging sensitive customer details beyond what is necessary for local debugging, especially transcripts, names, phone numbers, and visit dates.
