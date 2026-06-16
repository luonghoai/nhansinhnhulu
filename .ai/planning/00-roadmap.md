# 00 — Roadmap

Phased build plan. Each phase ends with a reviewable, working increment.
Phases are ordered so the **data layer is locked before UI/bot** to avoid rework.

---

## Phase 0 — Foundations (planning done → repo scaffolded)
**Goal:** Repo, tooling, env, and shared data contracts exist. Nothing user-facing yet.

- [ ] Monorepo layout decided (see Architecture). Default: two top-level apps in one repo.
- [ ] `web/` — Next.js app (landing + admin).
- [ ] `bot/` — Python Discord bot.
- [ ] Shared `.env.example` documenting every secret (no real values).
- [ ] MongoDB Atlas cluster provisioned; connection string in env (not committed).
- [ ] Data model finalized (`02-data-model.md`) and reviewed.
- [ ] Lint/format: ESLint+Prettier (web), Ruff+Black (bot).
- [ ] CI skeleton (lint + typecheck on PR).

**Exit criteria:** `web` runs locally on `/`, `bot` connects to Discord + Mongo and logs ready.

---

## Phase 1 — Data layer & seed
**Goal:** Collections, schemas, indexes, and seed/fixtures exist; both apps can read/write.

- [x] Mongoose models in `web/` for Member, Dungeon, Raid, JoinRequest.
- [x] `/api/bot/*` endpoints (Pattern B) so the bot can read/write without DB access.
- [x] Indexes: `Member.discordId` unique; `Raid.startAt`; `JoinRequest.status`.
- [x] Seed script (`web/scripts/seed.mts`, `npm run seed`): 14 members, 2 dungeons (6p + 12p),
      3 raids this week, 2 pending join requests. Clears collections + `syncIndexes` first.

**Exit criteria:** Seed runs; documents queryable from both web and bot.

---

## Phase 2 — Admin dashboard (members + dungeons)
**Goal:** Admin can manage master data.

- [ ] Admin auth (simple password → signed httpOnly session cookie; `/admin/login`).
- [ ] Members page: list synced members; add by Discord ID (fetch name+avatar via Discord REST);
      set class + classIcon; edit; delete.
- [ ] Dungeons page: CRUD master data (name, size 6/12, description).

**Exit criteria:** Admin can create a member from a Discord ID and a dungeon end-to-end.

---

## Phase 3 — Admin dashboard (raids + scheduling)
**Goal:** Admin builds the weekly schedule.

- [ ] Raids page: create raid (pick dungeon → size auto from dungeon, date/time, slots).
- [ ] Assign members to slots; remove/reorder.
- [ ] Support many raids per week, mixed sizes.

**Exit criteria:** A full week of raids can be created and rostered.

---

## Phase 4 — Landing page
**Goal:** Beautiful public page showing team + nearest raid(s).

- [ ] Hero with YouTube video background (muted, looped, autoplay, lazy/poster fallback).
- [ ] Team intro section.
- [ ] Nearest-raid section: dungeon info, date/time countdown, roster cards
      (Discord name, avatar, class, class icon).
- [ ] Glassmorphism / transparency, hover + click micro-interactions, responsive.
- [ ] Install **ui-ux-pro-max**, generate + persist `design-system/MASTER.md`, derive tokens.
- [ ] Built per `skills/ui-ux-pro.md`; pass its pre-delivery checklist.

**Exit criteria:** Landing renders live data; passes UI/UX checklist; Lighthouse ≥ 90 perf/a11y.

---

## Phase 5 — Discord bot
**Goal:** Members self-serve via Discord.

- [ ] Bot scaffold: httpx client for `/api/bot/*` + tiny `/notify` server (aiohttp/FastAPI).
- [ ] `/myplan` — show member's rostered raids now → end of week (via web API).
- [ ] `/raids` — list upcoming raids (select menu) → choose one to join (via web API).
- [ ] Auto-create minimal member on first interaction (POST /api/bot/members/ensure).
- [ ] Create JoinRequest (pending) on selection; confirm to user.

**Exit criteria:** A member with no prior record can request to join and see it pending.

---

## Phase 6 — Approval loop & polish
**Goal:** Close the request→approve loop and harden.

- [ ] Admin: Join Requests page — approve/reject; approve places member into a free slot.
- [ ] Web pushes decision to bot `/notify`; member DM'd; raid appears in `/myplan`.
- [ ] Error states, empty states, loading skeletons on web.
- [ ] Rate-limit Discord REST calls + `/admin/login`; cache avatars sensibly.
- [ ] Final security pass (`rules/security.md`).

**Exit criteria:** Full loop works: bot request → admin approve → landing + myplan update.

---

## Phase 7 — Deploy & handover
- [ ] Deploy `web` to Vercel (env vars set).
- [ ] Deploy `bot` to a VPS (systemd/Docker); expose `/notify` reachable by the web.
- [ ] Smoke test prod end-to-end.
- [ ] README + ops runbook.

---

## Dependency graph (build order)
```
Phase 0 ─► Phase 1 ─► Phase 2 ─► Phase 3 ─► Phase 4 (landing)
                                   └────────► Phase 5 (bot) ─► Phase 6 ─► Phase 7
```
Landing (4) and Bot (5) can be built in parallel once Phase 3 data exists.
