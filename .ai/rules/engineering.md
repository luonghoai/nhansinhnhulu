# Rules — Engineering

Conventions every agent follows. Keep changes small, typed, and reviewable.

## General
- One concern per PR. Keep diffs focused. No drive-by refactors.
- No TODO left without a tracking note. No dead/commented-out code in merges.
- Prefer clarity over cleverness. Name things in the domain language (see CONTEXT glossary).
- Never invent data shapes — follow `planning/02-data-model.md` and `06-api-contract.md`.

## Web (Next.js)
- Next.js App Router + TypeScript (strict). React Server Components by default;
  client components only when interactivity requires it.
- Tailwind for styling. Co-locate component styles. No inline magic numbers for
  the design system — use tokens (see skills/ui-ux-pro.md).
- Data access only on the server (route handlers / server components). Never expose
  the Mongo URI or Discord/bot tokens to the client.
- Mongoose models in `web/lib/models`; a single shared `db` connection helper
  (cache the connection across hot reloads / serverless invocations).
- Validate all inputs at the boundary (zod). Return typed JSON from route handlers.
- Handle loading / empty / error states for every data-driven view.

## Bot (Python)
- Python 3.11+, `discord.py` v2. Type hints everywhere.
- Data access ONLY via the web `/api/bot/*` API (httpx); no direct DB driver (Pattern B).
- Slash commands; use components (select menus, buttons) for flows.
- Store Discord IDs as strings.
- Idempotent guards before writes (no duplicate join requests).
- Graceful failure: catch & log, never crash the event loop on a single bad interaction.

## Shared
- All timestamps UTC in DB; render in TEAM_TIMEZONE.
- Lint/format must pass: ESLint+Prettier (web), Ruff+Black (bot).
- Typecheck must pass: `tsc --noEmit` (web), `mypy`/pyright optional (bot).
- Write a short test for any non-trivial pure logic (week-boundary calc, slot placement).

## File hygiene
- `.env` never committed. Update `.env.example` when adding a secret.
- Document any new env var in README + .env.example with a one-line purpose.
