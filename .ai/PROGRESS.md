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
    `TeamIntro` whenever `MONGODB_URI` is unset (local UI/UX demo).
- **Phase 1 — seed script** done:
  - `web/lib/classes.ts` + `web/lib/assets.ts`: canonical 7-class NSNL list (name ↔ icon key)
    and asset-key→URL resolvers (`classIconSrc`, `dungeonBannerSrc`); shipped class `.webp`
    icons + 2 dungeon banners under `web/public/assets/{classes,dungeons}/`. Wired into
    admin Members table (class `<select>` auto-fills icon), MemberCard badge, RaidCard banner.
  - `web/scripts/seed.mts` (`npm run seed`, runs via `tsx` — added as devDep): loads
    `.env.local`/`.env`, clears the 4 collections, `syncIndexes`, then inserts 2 dungeons
    (real banner-backed), 14 members (cycling canonical classes), 3 scheduled raids this week
    (6p 5/6, 12p 9/12, plus a 2nd 6p 3/6), and 2 pending join requests. `tsc`/`eslint` clean;
    no-DB guard verified (clean error + exit 1). Not yet run against a live Atlas cluster
    (no `MONGODB_URI` configured locally).
  - Note: `web/lib/mockData.ts` is kept as the no-DB landing fallback (useful for Vercel
    previews without a cluster), not deleted — seed is the canonical path once Atlas is wired.

- **Phase 5 — Discord bot (`bot/`)** done (scaffold + commands, not yet live-tested):
  - `bot/pyproject.toml` (discord.py>=2.4, httpx, aiohttp, python-dotenv; ruff+black config),
    `.env.example`, `.gitignore`, `README.md`.
  - `bot/main.py`: loads config, starts aiohttp `/notify` server + discord.py gateway on one
    asyncio loop; fails fast on missing config.
  - `bot/bot/`: `config.py` (validated frozen `Config`), `api.py` (`WebApi` httpx client wrapping
    all four `/api/bot/*` with `X-Bot-Secret`; `ApiError` carries status+message for guard
    responses), `time_utils.py` (UTC ISO → `TEAM_TIMEZONE`), `client.py` (`NSNLBot`, default
    intents only, guild/global command sync, `ensure_member`, tree error handler),
    `notify_server.py` (aiohttp `POST /notify` secret-guarded → DM member, always 200; `/health`).
  - Commands: `commands/myplan.py` (`/myplan`, ephemeral embed), `commands/raids.py` (`/raids`)
    + `views/raid_select.py` (Select → detail embed + "Request to join" button; maps web 404/409
    guards to friendly messages).
  - Verified: `ruff check` + `black --check` clean, imports OK, config loads; aiohttp `/notify`
    server unit-tested (401 no-secret / 400 bad-payload / 200 approve+reject / `/health` 200, DM
    path stubbed). **Not yet live-tested** against Discord (needs real `DISCORD_BOT_TOKEN`) or a
    running web API.
  - Fixed root `.env.example`: `BOT_NOTIFY_URL` is the base url (web appends `/notify`).

## Remaining (roughly in order)

1. **Phase 0 leftovers**
   - Root `.env.example` (shared vars) — confirm it exists/is complete (web's `.env.example`
     references it).
   - Decide on git init for the monorepo (currently no `.git` anywhere — `web/`'s nested
     `.git` was already removed). Not started.
   - CI skeleton (lint + typecheck on PR) — not started.

2. **Phase 1 — seed script** — DONE (`web/scripts/seed.mts`). Remaining: run it once against
   a provisioned Atlas cluster to confirm end-to-end (needs `MONGODB_URI` in `web/.env.local`).

3. **Phase 4 — landing polish leftovers (owner-provided content)**
   - Hero video background: YouTube ID still pending (`.ai/specs/open-questions.md` item 14)
     — set `NEXT_PUBLIC_HERO_YOUTUBE_ID` once provided (component already lazy-loads it).
   - TeamIntro copy/stats are placeholders (`—`) — needs real content once available
     (item 16).
   - Footer Discord invite link — set `NEXT_PUBLIC_DISCORD_INVITE_URL` once provided
     (item 17).

4. **Phase 5 — Discord bot (`bot/`)** — DONE (see above). Remaining: live smoke test with a
   real `DISCORD_BOT_TOKEN` against a running web API (commands appear in dev guild; `/raids`
   join flow creates a pending request; web `/notify` push DMs the member).

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
