# Rules — Security & Secrets

## Secrets
- Secrets live in env vars only. Never in code, never in the client bundle, never committed.
- Required secrets (document in .env.example):
  - `MONGODB_URI` — Atlas connection string (WEB ONLY; bot has no DB access in Pattern B).
  - `DISCORD_BOT_TOKEN` — one token, shared: web (fetch user by ID) + bot service.
  - `ADMIN_PASSWORD_HASH` — hash of the admin password (simple-password auth).
  - `SESSION_SECRET` — signs the admin session cookie.
  - `BOT_API_SECRET` — shared secret for web↔bot calls (both directions).
  - `BOT_NOTIFY_URL` — where the web pushes approve/reject notifications (bot's /notify).
  - `WEB_API_BASE_URL` — where the bot reaches `/api/bot/*`.
  - `TEAM_TIMEZONE`.
- Web vs client: only `NEXT_PUBLIC_*` vars reach the browser. Never prefix a secret with that.

## Auth & access control
- Admin: **simple password** → signed httpOnly session cookie. Verify the cookie on
  **every** `/admin/*` page and admin `/api/*` request, not just at login.
- Store the admin password as a hash (`ADMIN_PASSWORD_HASH`); compare with a constant-time check.
- Rate-limit `/admin/login`.
- Bot↔web endpoints require the `X-Bot-Secret` header (both `/api/bot/*` and the bot's
  `/notify`); reject mismatches.

## Data handling
- Store Discord snowflakes as strings (precision).
- Don't log full tokens or full Mongo URIs. Redact in logs.
- Avatar URLs are public CDN links — fine to store/display.
- Rate-limit Discord REST calls (user fetches); cache where reasonable.

## Input validation
- Validate/parse all external input (admin forms, bot interactions) with a schema.
- Enforce invariants from 06-api-contract.md (slot count, unique member per raid, etc.).

## Dependencies
- Pin versions. Review new deps. No unmaintained/abandoned packages for core paths.
