# Skill — Building the Next.js App (landing + admin)

## Setup
- `create-next-app` with TypeScript, App Router, Tailwind, ESLint.
- Add: `mongoose`, `zod`, `iron-session` (or `jose` for signed-JWT cookie),
  `bcryptjs`/`argon2` (verify admin password hash), `date-fns` + `date-fns-tz`
  (week/TZ math), `lucide-react` (SVG icons — no emoji icons).
- Install the **ui-ux-pro-max** skill for the landing (see skills/ui-ux-pro.md):
  `npm i -g uipro-cli && uipro init --ai claude`.

## Structure
```
web/
  app/
    (public)/page.tsx            # landing
    (public)/layout.tsx
    (admin)/admin/login/page.tsx # simple-password login
    (admin)/admin/layout.tsx     # auth guard (session cookie)
    (admin)/admin/members/page.tsx
    (admin)/admin/dungeons/page.tsx
    (admin)/admin/raids/page.tsx
    (admin)/admin/requests/page.tsx
    api/...                      # route handlers
  lib/
    db.ts                        # cached mongoose connection
    models/{Member,Dungeon,Raid,JoinRequest}.ts
    discord.ts                   # REST fetch user by ID (server-only)
    auth.ts                      # password verify + signed session cookie helpers
    botClient.ts                 # push to BOT_NOTIFY_URL on approve/reject (X-Bot-Secret)
    time.ts                      # week boundaries in TEAM_TIMEZONE
    validators.ts                # zod schemas
  components/...                 # see 03-landing.md inventory
  public/assets/classes/         # class icons (provided later)
```

## DB connection (serverless-safe)
- Cache the mongoose connection on `globalThis` to survive hot reload / lambda reuse.
- Connect lazily inside server code; never at module top-level in client files.

## Discord user fetch (server-only)
- `GET https://discord.com/api/v10/users/{id}` with `Authorization: Bot <token>`.
- Build avatar URL from `avatar` hash, or use the default avatar if null.
- Rate-limit aware; surface "user not found" cleanly.

## Auth (admin — simple password)
- `/admin/login`: POST password → verify against `ADMIN_PASSWORD_HASH` (constant-time) →
  set signed httpOnly session cookie (iron-session or signed JWT with `SESSION_SECRET`).
- Guard via `middleware.ts` + `(admin)/admin/layout.tsx`: no valid cookie → redirect to login.
- Re-validate the cookie in EVERY admin `/api/*` handler. Rate-limit the login route.

## Time/week math
- All week-boundary and "nearest"/"this week" computations use `date-fns-tz` with
  `TEAM_TIMEZONE`. Store UTC, compute boundaries in team TZ, query in UTC.

## Patterns
- Server Components fetch data directly via models; Client Components call route handlers.
- Use zod to validate route handler inputs; return typed JSON.
- Optimistic UI for admin tables; toasts for success/error; confirm destructive actions.

## Bot integration (Pattern B)
- Implement `/api/bot/*` (members/ensure, raids/upcoming, members/:id/plan, requests),
  all guarded by the `X-Bot-Secret` header (`BOT_API_SECRET`).
- On approve/reject, after updating Mongo, POST `BOT_NOTIFY_URL` `{discordId, decision, raidId, reason?}`
  with `X-Bot-Secret`, then set `notifiedAt`. Tolerate the bot being unreachable.

## Landing build (ui-ux-pro-max)
- Run the design-system generator and persist `design-system/MASTER.md` BEFORE coding the landing.
- Derive all landing tokens from it; honor its pre-delivery checklist. See skills/ui-ux-pro.md.

## Quality gates
- `tsc --noEmit`, ESLint clean, builds on Vercel. Landing meets UI/UX checklist.
