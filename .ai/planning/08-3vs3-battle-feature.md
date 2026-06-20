# 09 — Feature: 3v3 Battle Events

PVP-style internal events where the admin pools participants, the system randomly
forms 3-person teams, the teams fight, and the admin records winners to award score.
Mirrors the **raids** pattern: announced on Discord, members can request to join via
a bot command, admin approves into the participant pool.

> Status: planning. Follows existing conventions in `02-data-model.md`, `06-api-contract.md`,
> `04-admin-dashboard.md`, `05-discord-bot.md`. Integration = **Pattern B** (bot ↔ web via
> `/api/bot/*` with `X-Bot-Secret`; web **pushes** to bot `/notify`). Times stored UTC,
> rendered `Asia/Ho_Chi_Minh`.

---

## 1. Glossary additions

- **Battle Event** — an internal 3v3 competition with a participant pool, generated teams,
  rounds, and scores. Distinct from a Raid (no dungeon, no fixed 6/12 size).
- **Battle Team** — a 3-person team auto-generated from the pool. Has an editable `name`
  and a running `score`.
- **Participant** — a Member added to a Battle Event's pool (by admin directly, or via an
  approved join request from the bot). `participants.length % 3 === 0` is enforced before
  teams can be generated.
- **Round / Match result** — admin picks the winning team; that team's `score` increments.

---

## 2. Business rules

- Pool size must be **divisible by 3** to generate teams (`count % 3 === 0`, count ≥ 3).
- Team generation is **random**: shuffle the pool, slice into groups of 3.
- Generating teams is **idempotent-by-intent**: re-generating reshuffles and **resets scores**
  (warn admin with a confirm). Lock regeneration once any score > 0 unless admin confirms reset.
- Team `name` is editable any time (default `Team 1`, `Team 2`, …).
- Scoring: admin selects a winning team → `score += 1` (support −1 undo). No auto-elimination;
  free-form bracket/round-robin run by the admin.
- A Member may appear in **at most one** team per event.
- Event lifecycle: `draft` → `open` (join requests allowed) → `teams_generated` → `completed`.
- Join requests reuse the **raids** approval flow; approving adds the member to `participants`.
- Editing the pool after teams are generated requires re-generating teams.

---

## 3. Data model

### Collection: `battleEvents`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `title` | string | e.g. "Tỷ Thí Tuần 3" |
| `description` | string \| null | optional |
| `startAt` | Date (UTC) | event date/time |
| `status` | string | `draft` \| `open` \| `teams_generated` \| `completed` (default `draft`) |
| `participants` | ObjectId[] → members | the pool (deduped) |
| `teams` | Team[] | embedded; empty until generated |
| `announceMessageId` | string \| null | Discord message id of the announcement (for edits) |
| `createdAt`/`updatedAt` | Date | |

**Team (embedded):**
| Field | Type | Notes |
|-------|------|-------|
| `teamId` | string | stable id (nanoid) — survives renames |
| `name` | string | editable, default `Team N` |
| `memberIds` | ObjectId[] → members | exactly 3 |
| `score` | number | default `0`, ≥ 0 |

**Indexes:** `{ startAt: 1 }`, `{ status: 1, startAt: 1 }`.

```jsonc
{
  "title": "Tỷ Thí Tuần 3",
  "startAt": "2026-06-21T13:00:00Z",
  "status": "teams_generated",
  "participants": ["m1","m2","m3","m4","m5","m6"],
  "teams": [
    { "teamId":"a1", "name":"Hắc Long", "memberIds":["m3","m1","m5"], "score": 2 },
    { "teamId":"b2", "name":"Team 2",   "memberIds":["m2","m6","m4"], "score": 1 }
  ],
  "announceMessageId": "123456789",
  "createdAt":"…","updatedAt":"…"
}
```

### `joinRequests` (reuse, extend)

Make the existing collection polymorphic so it serves both raids and battles:

- Add `targetType`: `"raid"` \| `"battle"` (default `"raid"` for back-compat).
- Add `battleEventId`: ObjectId \| null (set when `targetType="battle"`).
- `raidId` becomes nullable when `targetType="battle"`.
- Approve = push `memberId` into `battleEvents.participants` (dedupe) instead of a raid slot.

> Indexes already cover `{status, createdAt}`. Add partial-unique on
> `{battleEventId, memberId}` where `targetType="battle"` to block dupes.

---

## 4. API contract (admin + bot)

### Admin endpoints (dashboard, session-cookie auth)

```
POST   /api/battles                       { title, description?, startAt }            → BattleEvent (draft)
GET    /api/battles                       ?status=                                    → BattleEvent[]
GET    /api/battles/:id                                                               → BattleEvent
PATCH  /api/battles/:id                   { title?, description?, startAt?, status? }  → BattleEvent
DELETE /api/battles/:id                                                               → { ok }

POST   /api/battles/:id/participants      { memberId }                                → BattleEvent   // add
DELETE /api/battles/:id/participants/:memberId                                        → BattleEvent   // remove

POST   /api/battles/:id/generate-teams    { confirmResetScores?: boolean }            → BattleEvent
        // 422 if participants.length % 3 !== 0; requires confirm if any score > 0

PATCH  /api/battles/:id/teams/:teamId     { name }                                    → BattleEvent   // rename
POST   /api/battles/:id/teams/:teamId/win { delta?: 1 | -1 }                          → BattleEvent   // score ±

POST   /api/battles/:id/announce                                                      → { messageId }  // web → bot /announce
```

### Bot → Web endpoints (Pattern B, `X-Bot-Secret`)

```
GET  /api/bot/battles/upcoming                        → BattleEvent[] (now → end of week, status open/teams_generated)
POST /api/bot/battle-requests   { battleEventId, discordId }  → JoinRequest (pending, targetType=battle)
```

### Web → Bot endpoints (push)

```
POST {BOT_BASE}/announce   { kind:"battle", battleEventId, channelId? }   // post announcement, mention members
POST {BOT_BASE}/notify     { kind:"battle_decision", discordId, battleTitle, approved }  // DM requester (reuse existing /notify)
```

### DTO

```ts
type BattleTeam = { teamId: string; name: string; memberIds: string[]; score: number };
type BattleEvent = {
  id: string; title: string; description?: string | null;
  startAt: string; status: "draft"|"open"|"teams_generated"|"completed";
  participants: string[]; teams: BattleTeam[]; announceMessageId?: string | null;
};
```

---

## 5. Admin dashboard — `3v3` tab

Route: `/admin/battles` (new tab beside Members / Dungeons / Raids / Join Requests).

**List view:** events sorted by `startAt`, status badge, participant count, team count.
"Create event" opens a form (`title`, `description`, `startAt`).

**Detail view (one event):**
1. **Pool panel** — add participants from synced members (searchable picker), remove chips.
   Live counter shows `N participants` with a validity hint: ✅ when `N % 3 === 0`, else
   "add/remove K to make divisible by 3". Pending battle join-requests surface here to approve.
2. **Generate teams** button — disabled until pool is valid. On click (with reset-confirm if
   scores exist) calls `generate-teams`; renders the resulting team cards.
3. **Team cards** — each shows editable `name` (inline edit → PATCH), the 3 members
   (avatar + name + class icon), current `score`, and **“Mark win”** (+1) and a small undo (−1).
4. **Announce** button — posts/edits the Discord announcement (calls `/announce`).
5. Status control: `draft → open → completed`.

> Use the **ui-ux-pro-max** skill for this tab (same design system/tokens as the rest of the
> admin). Confirm dialogs on regenerate-with-reset and delete.

---

## 6. Discord bot

### Announcement (on admin "Announce")
Web posts to bot `/announce`. Bot sends an embed to the configured text channel:
- Title, date/time (rendered `Asia/Ho_Chi_Minh`), description.
- If teams generated: one field per team — team name, **@mentions** of its 3 members, score.
- If only pool open: list/mention current participants + a "use `/battle` to join" hint.
- Save returned `messageId` → `announceMessageId` so later announces **edit** the same message.

### Member command (mirror `/raids`)
- `/battle` (or `/3v3`): browse upcoming battle events → "Request to join" button →
  bot calls `POST /api/bot/battle-requests` → creates a pending request (targetType=battle).
  If member not yet synced, bot ensures the member record first (existing `members/ensure`).
- Decision DM reuses the existing **push** `/notify` flow (web posts on approve/reject).

| Command | Who | Effect |
|---------|-----|--------|
| `/battle` | member | browse upcoming 3v3 events + request to join |
| (reused) `/myplan` | member | optionally also list battle events they're in |

---

## 7. Edge cases

- Pool not divisible by 3 → generate disabled (API returns 422).
- Member removed from pool after teams generated → require regenerate (stale team blocked).
- Duplicate join request → partial-unique index + guard.
- Member left guild / DM closed → notify fails silently, continue (same as raids).
- Re-announce after rename/score change → edit existing `announceMessageId` message.
- Score never below 0 (clamp on −1 undo).
- Soft-deleted/inactive members can't be added to a pool.

---

## 8. Build order

1. `battleEvents` schema + `joinRequests` polymorphic fields (migration: default existing → `targetType="raid"`).
2. Admin API routes (CRUD, participants, generate-teams, rename, win).
3. `/admin/battles` tab UI (ui-ux-pro-max).
4. Bot `/api/bot/battles/*` + web→bot `/announce`; reuse `/notify`.
5. Bot `/battle` command + announcement embed (with mentions, message edit).
6. QA: divisibility, regenerate-reset, scoring undo, announce-edit, join→approve→DM.

---

## 9. Pending from owner

- Discord **channel ID** for battle announcements (or reuse the raids channel?).
- Default team-naming scheme (numbers vs themed pool) — defaulting to `Team N`.
- Whether `/myplan` should include battle events (assumed yes).
