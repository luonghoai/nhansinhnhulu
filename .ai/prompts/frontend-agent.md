# Prompt — Frontend Agent (Next.js landing + admin)

You build the **Next.js** part of NSNL: the public **landing page** and the **admin
dashboard**, in one app deployed to Vercel. You share a MongoDB with a Python bot.

## Read first
- `.ai/CONTEXT.md` (domain + glossary), `.ai/planning/02-data-model.md` (the data contract),
  `.ai/planning/03-landing.md`, `.ai/planning/04-admin.md`, `.ai/planning/06-api-contract.md`.
- `.ai/skills/nextjs-app.md` (how to build), `.ai/skills/ui-ux-pro.md` (landing quality bar).
- `.ai/rules/engineering.md` + `.ai/rules/security.md`.

## What to build
**Landing (public, no auth):** built with the **ui-ux-pro-max** skill — FIRST install it and
run its design-system generator, persisting `design-system/MASTER.md`, then derive all tokens
from it (see skills/ui-ux-pro.md). Hero with YouTube video background (muted/looped/autoplay,
poster fallback, reduced-motion + mobile fallback, dark overlay), team intro, and the
**nearest one 6p + one 12p** raid showing dungeon info, localized date/time + countdown, and a
roster of member cards (avatar, Discord name, class, class icon). Glass/transparency,
hover + click micro-interactions, reveal-on-scroll. Pass the skill's pre-delivery checklist.

**Admin (auth-gated `/admin`):**
- Auth: **simple password** → signed httpOnly session cookie (verify `ADMIN_PASSWORD_HASH`,
  sign with `SESSION_SECRET`). Guard via middleware; re-check the cookie on every admin request.
  `/admin/login` page; rate-limit it.
- **Members:** add by Discord ID → server fetches name+avatar via Discord REST (bot token,
  server-only) → admin sets class + classIcon (controlled list). Edit / re-sync / delete (soft).
- **Dungeons:** CRUD master data (name, size 6/12, description).
- **Raids:** create raids for the week (pick dungeon → size auto; date/time in team TZ stored
  UTC; assign members to slots). Many raids/week, mixed sizes. Edit roster, cancel/complete.
- **Join Requests:** list pending; approve (place member into a free slot) / reject.
  On decision, POST the bot's `/notify` (`BOT_NOTIFY_URL`, header `X-Bot-Secret`) then set `notifiedAt`.

**Bot API (Pattern B):** implement `/api/bot/*` (members/ensure, raids/upcoming,
members/:discordId/plan, requests), all guarded by `X-Bot-Secret`. These are how the Python
bot reads/writes — it never touches Mongo directly.

## Rules & constraints
- TypeScript strict, App Router, Tailwind. Server-side data access only; no secrets client-side.
- Cache the Mongoose connection (serverless-safe). Validate inputs with zod.
- Discord IDs as strings. Week/TZ math with date-fns-tz and `TEAM_TIMEZONE`.
- Class names ↔ classIcon keys come from ONE controlled list shared with landing.
- Class icons live in `web/public/assets/classes/` (owner provides; use placeholders meanwhile).
- Handle loading / empty / error states everywhere.

## Locked decisions (from specs/open-questions.md)
- Landing shows nearest **one 6p + one 12p**. Soft-delete members. Block deleting a referenced
  dungeon. Keep past raids as history. Integration = **Pattern B** (you own all business logic).
- Content not yet provided (YouTube ID, class list+icons, intro copy) → use clear placeholders.

## Done means
`tsc --noEmit` clean, ESLint clean, builds on Vercel. Admin flows work end-to-end with seed
data. `/api/bot/*` works with the shared secret. Landing renders live nearest 6p+12p data,
derives tokens from `design-system/MASTER.md`, and passes the ui-ux-pro-max pre-delivery checklist.
