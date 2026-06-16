# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repo currently contains **only the planning pack** under `.ai/` — no `web/` or `bot/`
code exists yet. Before writing any code, read `.ai/CONTEXT.md` in full; it is the single
source of truth for what is being built, the domain glossary, and locked v1 decisions.

## What this is

A 3-part system for **Nhân Sinh Như Lữ (NSNL)**, a PVE guild for the game **Nghịch Thủy Hàn**:

1. **Landing page** — Next.js (App Router) + TypeScript + Tailwind, public, read-only.
2. **Admin dashboard** — same Next.js app, route group `(admin)/admin/*`, simple-password
   session-cookie auth.
3. **Discord bot** — Python `discord.py` v2, deployed separately on a VPS.

Landing + admin are **one Vercel deployment** (`web/`). The bot is a **separate Python
service** (`bot/`). Both share one MongoDB Atlas database, but **only `web/` has DB access**.

## Reading order for planning docs

1. `.ai/CONTEXT.md` — what/why + domain glossary (read first, always).
2. `.ai/planning/00-roadmap.md` — phased build plan (data layer before UI/bot).
3. `.ai/planning/01-architecture.md` — system diagram, repo layout, integration pattern.
4. `.ai/planning/02-data-model.md` — MongoDB collections (the data contract).
5. `.ai/planning/03-landing.md`, `04-admin.md`, `05-discord-bot.md` — per-component specs.
6. `.ai/planning/06-api-contract.md` — shared DTOs and endpoint contracts (bot ↔ web).
7. `.ai/specs/open-questions.md` — locked v1 decisions; still-pending items use placeholders.
8. `.ai/rules/*` — binding conventions (engineering, security, git-workflow).
9. `.ai/skills/*` — how-to playbooks (nextjs-app, discord-bot, ui-ux-pro).

## Critical architecture facts

- **Integration = Pattern B (locked):** the bot never touches MongoDB directly. It calls
  `web`'s `/api/bot/*` routes with header `X-Bot-Secret: <BOT_API_SECRET>`. The Next.js API
  is the single source of business logic — all validation/invariants live there.
- **Push notifications:** on approve/reject, `web` POSTs to `{BOT_NOTIFY_URL}/notify`
  (same shared secret) so the bot can DM the member immediately. No polling.
- **Identity:** Discord ID (snowflake) is the canonical member key — always store/transmit
  as a **string**, never a number (precision loss above 2^53).
- **Class / classIcon** are admin-managed only, never synced from Discord. NTH has a fixed
  roster of **7 canonical classes** — the name↔icon-key mapping lives in `web/lib/classes.ts`
  (`NSNL_CLASSES`), the single source of truth. Asset keys resolve to URLs via `web/lib/assets.ts`
  (`classIconSrc` → `/assets/classes/<key>.webp`, `dungeonBannerSrc` → `/assets/dungeons/<key>`).
- **Timezone:** store all timestamps in UTC; render/compute week boundaries in
  `TEAM_TIMEZONE` (default `Asia/Ho_Chi_Minh`) via `date-fns-tz`.
- **Admin auth:** single shared password (`ADMIN_PASSWORD_HASH`, constant-time compare) →
  signed httpOnly session cookie. No OAuth. Guard every `/admin/*` page and admin API route
  via middleware, re-validated on each request.

## Planned repo layout

```
nsnl/
├── .ai/                    ← planning, rules, skills, prompts
├── web/                    ← Next.js (landing + admin + api), deployed to Vercel
│   ├── app/
│   │   ├── (public)/       ← landing page "/"
│   │   ├── (admin)/admin/  ← dashboard, session-cookie gated
│   │   └── api/
│   │       ├── admin/      ← session-cookie guarded
│   │       ├── bot/        ← X-Bot-Secret guarded (Pattern B)
│   │       └── public/     ← read-only landing data
│   ├── lib/{models,db,discord,auth,botClient,time,validators,classes,assets}
│   ├── components/
│   └── public/assets/{classes,dungeons}/   ← class icons (7 .webp, shipped) + dungeon banners
├── bot/                    ← Python discord.py v2 bot, deployed to a VPS
│   ├── main.py
│   └── bot/{client,api,notify_server,time_utils,commands,views}
└── .env.example
```

## Tech stack (locked)

- **Web:** Next.js App Router, TypeScript (strict), Tailwind, Mongoose, zod, iron-session
  (or signed JWT via `jose`), bcryptjs/argon2, date-fns + date-fns-tz, lucide-react (no
  emoji icons).
- **Bot:** Python 3.11+, `discord.py>=2.4`, `httpx`, aiohttp/FastAPI (for `/notify` server),
  `python-dotenv`, `zoneinfo`. No Mongo driver on the bot.
- **DB:** MongoDB Atlas (free M0 tier).
- **Landing UI:** must use the **ui-ux-pro-max** skill — generate and persist
  `design-system/MASTER.md` before coding any landing component (see `.ai/skills/ui-ux-pro.md`).

## Data model summary (see `02-data-model.md` for full detail)

- `members` — keyed by unique `discordId`; `class`/`classIcon` are admin-set from the canonical
  7-class list in `web/lib/classes.ts` (class `<select>` auto-derives `classIcon`).
- `dungeons` — master data; `size` ∈ {6, 12}.
- `raids` — a scheduled run with `slots[]` (length === `size`), `startAt` (UTC),
  `status` ∈ scheduled/completed/cancelled. "Nearest" = `status=scheduled AND startAt >= now`.
- `joinRequests` — `pending` → `approved`/`rejected`; unique pending per `(raidId, memberId)`.
- Deleting a member referenced in a raid slot → null the slot (prefer soft-delete
  `isActive=false`). Deleting a dungeon referenced by raids is **blocked**.

## Conventions (from `.ai/rules/`)

- One concern per PR; no drive-by refactors; no dead/commented-out code.
- Never invent data shapes — follow `02-data-model.md` and `06-api-contract.md` exactly.
- Web: React Server Components by default; data access only server-side; never expose
  `MONGODB_URI` or Discord/bot tokens to the client; validate inputs with zod at the boundary.
- Bot: type hints everywhere; data access only via `/api/bot/*` (httpx), never direct DB;
  idempotent guards before writes (no duplicate join requests); catch & log per-interaction
  errors without crashing the event loop.
- Secrets only in env vars; update `.env.example` whenever a new one is introduced
  (see root `.env.example` for the full shared list).
- Conventional Commits (`feat:`, `fix:`, `chore:`, etc.); branches `feat/<area>-<short>`,
  `fix/<area>-<short>`.

## Quality gates (once code exists)

- Web: `tsc --noEmit`, ESLint clean, `next build` succeeds.
- Bot: Ruff + Black clean, bot imports/connects cleanly (smoke test).
- Lint/format: ESLint+Prettier (web), Ruff+Black (bot).
