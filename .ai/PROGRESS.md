# Progress tracker

Read this first when resuming work in a new session. Update it whenever a task is
completed or the plan changes. Cross-reference `.ai/planning/00-roadmap.md` for phase
definitions.

## Done

- `CLAUDE.md` written at repo root.
- `web/` scaffolded (Next.js App Router, TS strict, Tailwind v4):
  - `lib/`: `db.ts`, `time.ts`, `validators.ts`, `auth.ts`, `discord.ts`, `botClient.ts`,
    `botAuth.ts`, `dto.ts`, `queries.ts`, `rateLimit.ts`.
  - `lib/models/`: `Member`, `Dungeon`, `Raid`, `JoinRequest`.
  - `proxy.ts` (Next 16 middleware replacement) guarding `/admin/*` and `/api/admin/*`.
  - Admin: login/logout API routes, `AdminNav`, admin layout, login page, dashboard,
    Members/Dungeons/Raids/Requests pages + client panels, full CRUD API routes.
  - Bot-facing API (`/api/bot/*`): `members/ensure`, `raids/upcoming`,
    `members/[discordId]/plan`, `requests` (create join request), all `X-Bot-Secret` guarded.
  - Public API: `/api/public/raids/nearest` (graceful empty fallback if DB not configured).
  - Landing page: Navbar, Hero (placeholder, no video yet), TeamIntro (placeholder copy),
    RaidSection (live data via `getNearestRaids`), Countdown, MemberCard/OpenSlotCard, Footer.
  - `web/.env.example` created.
- Verified: `npx tsc --noEmit` clean, `npx eslint .` clean, `npm run dev` smoke-tested
  (landing 200, `/admin` redirects 307 when unauthenticated, `/admin/login` 200,
  `/api/public/raids/nearest` returns `{ raids: [] }` gracefully without `MONGODB_URI`).
- **Phase 4 — landing polish (ui-ux-pro-max)** done:
  - Installed `ui-ux-pro-max` skill (`.claude/skills/ui-ux-pro-max/`, via `uipro-cli`).
  - Curated `web/design-system/nhan-sinh-nhu-lu/MASTER.md` (the generic `--design-system`
    output recommended a mismatched light "Exaggerated Minimalism" palette — replaced with
    a hand-picked "Ink, Jade & Gold" dark/glassmorphism system: ink `#0A0F0D` bg, jade
    `#34D399` accent, gold `#D4AF37` CTA, Playfair Display + Inter, both w/ Vietnamese
    subsets) + page override `web/design-system/nhan-sinh-nhu-lu/pages/landing.md`.
  - `app/layout.tsx` + `app/globals.css`: wired `font-display`/`font-body` tokens, ink/jade/
    gold/glass/shadow CSS vars, `[data-reveal]` reveal-on-scroll utility (respects
    `prefers-reduced-motion`).
  - New components: `SectionReveal` (IntersectionObserver, fires once), `HeroVideoBackground`
    (gradient poster always; lazy-loads YouTube iframe behind
    `NEXT_PUBLIC_HERO_YOUTUBE_ID`, skipped under reduced-motion).
  - Restyled Hero (scroll-cue chevron), Navbar, Footer (optional Discord invite via
    `NEXT_PUBLIC_DISCORD_INVITE_URL`), TeamIntro, RaidSection/RaidCard/MemberCard/
    OpenSlotCard/Countdown with jade hover glows, glass tokens, Lucide icons (no emojis).
  - Added both new env vars to `web/.env.example`.
  - Re-verified `tsc --noEmit` + `eslint` clean, dev server smoke test (landing 200, HTML
    contains expected reveal/hero markup).
  - Added `web/lib/mockData.ts` (demo-only, matches DTO shapes): one 6-man + one 12-man
    raid with rostered/open slots, NSH-flavored member names + classes, Discord embed
    default avatars, and demo `TeamIntro` stats. Used automatically by `RaidSection`/
    `TeamIntro` whenever `MONGODB_URI` is unset (local UI/UX demo); remove once real seed
    data (Phase 1) lands.

## Remaining (roughly in order)

1. **Phase 0 leftovers**
   - Root `.env.example` (shared vars) — confirm it exists/is complete (web's `.env.example`
     references it).
   - Decide on git init for the monorepo (currently no `.git` anywhere — `web/`'s nested
     `.git` was already removed). Not started.
   - CI skeleton (lint + typecheck on PR) — not started.

2. **Phase 1 — seed script**
   - Add a seed script (a few members, 2 dungeons [6p + 12p], 2-3 raids this week) so the
     app can be exercised against real-ish data. Not started.

3. **Phase 4 — landing polish leftovers (owner-provided content)**
   - Hero video background: YouTube ID still pending (`.ai/specs/open-questions.md` item 14)
     — set `NEXT_PUBLIC_HERO_YOUTUBE_ID` once provided (component already lazy-loads it).
   - TeamIntro copy/stats are placeholders (`—`) — needs real content once available
     (item 16).
   - Footer Discord invite link — set `NEXT_PUBLIC_DISCORD_INVITE_URL` once provided
     (item 17).

4. **Phase 5 — Discord bot (`bot/`)** — not started at all.
   - Scaffold `bot/main.py`, `bot/bot/{client,api,notify_server,time_utils,commands,views}`.
   - `httpx` client for `/api/bot/*`; tiny `/notify` server (aiohttp/FastAPI).
   - `/myplan` command (calls `GET /api/bot/members/{discordId}/plan`).
   - `/raids` command (calls `GET /api/bot/raids/upcoming`, select menu to join → POST
     `/api/bot/requests`).
   - Auto-ensure member on first interaction (`POST /api/bot/members/ensure`).
   - Ruff + Black config.

5. **Phase 6 — approval loop polish**
   - End-to-end test: bot join request → admin approve/reject → `notifyBot` → bot `/notify`
     DM → `/myplan` reflects update.
   - Error/empty/loading states polish on web.
   - Final security pass per `.ai/rules/security.md`.

6. **Phase 7 — deploy**
   - Vercel deploy for `web` (set env vars).
   - VPS deploy for `bot` (systemd/Docker), `/notify` reachable from web.
   - Prod smoke test, README + ops runbook.

## Suggested next session entry point

Start at **item 4 (Discord bot scaffold)** unless the user wants seed data / CI / landing
polish first — ask which before diving in, since these are independent tracks.
