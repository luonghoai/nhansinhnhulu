# Feature: Giải Đấu Cờ 5 Quân (1v1 Caro / Gomoku Tournament)

> Status: planning. Follows existing conventions in `02-data-model.md`, `06-api-contract.md`,
> `04-admin-dashboard.md`, `05-discord-bot.md`. Integration = **Pattern B** (bot ↔ web via
> `/api/bot/*` with `X-Bot-Secret`; web **pushes** to bot `/notify`). Times stored UTC,
> rendered `Asia/Ho_Chi_Minh`. UI built with the **ui-ux-pro-max** skill (same tokens as the
> rest of the admin + landing).

`Cờ 5 Quân` is a 1v1 five-in-a-row (caro/gomoku) **internal tournament**. Unlike Raids
(team PVE) and the 3v3 Battle (pool → teams), this is a **single-elimination knockout that
funnels into a round-robin final**. It is admin-driven: the admin enters 20 players, the
system randomly seeds Round 1, the admin records best-of-3 series scores, and winners
auto-advance through the rounds until placements 1/2/3 are decided.

---

## 1. Glossary additions

- **Tournament** — one `Cờ 5 Quân` competition instance. Has 20 entrants and a fixed 3-round
  structure (defined by the poster luật chơi).
- **Entrant** — a player in the tournament. Stored as a free-text name (admin types all 20);
  optionally linked to a `members._id` if the name matches a synced member (for avatar/mention).
- **Match** — a single best-of-3 series between two entrants in Round 1 or Round 2. Recorded as
  a score like `2-1`; the entrant with ≥2 game wins advances.
- **Round** — `r1` (20→10), `r2` (10→5), `final` (round-robin of 5).
- **Standing** — for the final round only: each of the 5 plays 4 matches, +1 point per series
  win; total points rank top 1/2/3 (tie-break below).

---

## 2. Business rules (from the poster luật chơi)

**Vòng 1 (Round 1):**
- Exactly **20 entrants**, randomly paired into **10 matches** (shuffle list, slice into pairs).
- Each match is **BO3**; the entrant winning **>2 of 3** games (i.e. 2-0 or 2-1) advances.
- **10 winners** advance to Round 2.

**Vòng 2 (Round 2):**
- The 10 winners are paired into **5 matches**. Pairing is **by Round-1 standing order**
  (deterministic: order winners by their R1 match index, then pair 1-2, 3-4, …) — this matches
  the poster's *"theo thứ tự bảng đấu"*.
- Each match BO3, winner >2 advances. **5 winners** advance to the final.

**Vòng 3 — Chung kết (Round-robin final):**
- The **5 finalists** play a **round-robin**: every finalist plays **4 matches**, one vs each
  other finalist (10 matches total, C(5,2)).
- Each match is BO3; **+1 point** to the series winner.
- Final ranking = **total points**, descending. **Top 1 / 2 / 3** are awarded.
- Tie-break order: (1) head-to-head result between tied players, (2) total game wins across all
  final matches, (3) admin manual decision (flagged in UI). *Confirm tie-break preference.*

**General:**
- A match score must be one of `2-0`, `2-1`, `0-2`, `1-2` (BO3 → loser ≤1). Validation rejects
  anything else (e.g. `1-1`, `3-0`).
- Recording an R1/R2 result **auto-advances** the winner into the next round's bracket slot.
- Editing an already-recorded result re-computes downstream advancement (with a confirm if
  later results would be invalidated — see edge cases).
- Tournament lifecycle: `draft` → `seeded` (R1 generated) → `r1_done` → `r2_done` →
  `final` → `completed`.

---

## 3. Data model

### Collection: `tournaments`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `title` | string | e.g. "Giải Đấu Cờ 5 Quân Tuần 1" |
| `description` | string \| null | optional |
| `startAt` | Date (UTC) | event date/time |
| `gameType` | string | const `"co5quan"` (room for future game types) |
| `status` | string | `draft` \| `seeded` \| `r1_done` \| `r2_done` \| `final` \| `completed` |
| `entrants` | Entrant[] | exactly 20 once seeded |
| `rounds` | { r1: Match[]; r2: Match[]; final: Match[] } | bracket + round-robin |
| `standings` | Standing[] \| null | computed for final round (5 rows) |
| `placements` | { first?, second?, third? } | entrantId refs, set on `completed` |
| `announceMessageId` | string \| null | Discord message id (for edits) |
| `createdAt` / `updatedAt` | Date | |

**Entrant (embedded):**
| Field | Type | Notes |
|-------|------|-------|
| `entrantId` | string | stable id (nanoid) |
| `name` | string | admin-typed display name |
| `memberId` | ObjectId \| null | optional link to `members` (avatar/mention) |
| `seed` | number | 1..20, assigned at random on seeding |

**Match (embedded):**
| Field | Type | Notes |
|-------|------|-------|
| `matchId` | string | nanoid |
| `round` | string | `r1` \| `r2` \| `final` |
| `slot` | number | bracket position within the round (R1: 0..9, R2: 0..4) |
| `aId` / `bId` | string \| null | entrantId of each side (null = bye/TBD) |
| `scoreA` / `scoreB` | number \| null | game wins, BO3 (null until recorded) |
| `winnerId` | string \| null | computed: side with ≥2 |

**Standing (embedded, final round only):**
| Field | Type | Notes |
|-------|------|-------|
| `entrantId` | string | finalist |
| `points` | number | series wins in round-robin (0..4) |
| `gameWins` | number | total games won (tie-break) |
| `rank` | number \| null | 1..5 once final completes |

**Indexes:** `{ startAt: 1 }`, `{ status: 1, startAt: 1 }`, `{ gameType: 1 }`.

### Example

```jsonc
{
  "title": "Giải Đấu Cờ 5 Quân Tuần 1",
  "startAt": "2026-06-28T13:00:00Z",
  "gameType": "co5quan",
  "status": "r1_done",
  "entrants": [
    { "entrantId":"e01", "name":"Lữ Khách A", "memberId":"m1", "seed":1 },
    { "entrantId":"e02", "name":"Lữ Khách B", "memberId":null, "seed":2 }
    /* …20 total */
  ],
  "rounds": {
    "r1": [
      { "matchId":"x1","round":"r1","slot":0,"aId":"e01","bId":"e02",
        "scoreA":2,"scoreB":1,"winnerId":"e01" }
      /* …10 total */
    ],
    "r2": [ /* …5 matches, aId/bId filled from r1 winners */ ],
    "final": [ /* …10 round-robin matches, generated when r2_done */ ]
  },
  "standings": null,
  "placements": {},
  "announceMessageId": "123456789"
}
```

> **Note vs `joinRequests`:** entrants are admin-typed (no bot join flow), so the polymorphic
> `joinRequests` collection is **not** extended for this feature. (If a `/giaidau` join command
> is wanted later, add `targetType:"tournament"` then — out of scope now.)

---

## 4. API contract (admin + bot)

### Admin endpoints (dashboard, session-cookie auth)

```
POST   /api/tournaments                      { title, description?, startAt }        → Tournament (draft)
GET    /api/tournaments                      ?status=                                → Tournament[]
GET    /api/tournaments/:id                                                          → Tournament
PATCH  /api/tournaments/:id                  { title?, description?, startAt?, status? } → Tournament
DELETE /api/tournaments/:id                                                          → { ok }

PUT    /api/tournaments/:id/entrants         { names: string[20] }                   → Tournament
        // replace full entrant list; 422 unless exactly 20 non-empty names
POST   /api/tournaments/:id/seed             { confirmReset?: boolean }              → Tournament
        // shuffle entrants, assign seeds, build r1 (10 matches); status→seeded
        // 422 if entrants.length !== 20; confirm if any result already recorded

PATCH  /api/tournaments/:id/matches/:matchId { scoreA, scoreB }                      → Tournament
        // validate BO3 (2-0/2-1/0-2/1-2); set winnerId; auto-advance into next round
        // when all r1 recorded → status r1_done & build r2; same r2→final (round-robin)

POST   /api/tournaments/:id/finalize                                                 → Tournament
        // compute standings + placements from final round-robin; status→completed
        // 422 if any final match unrecorded

POST   /api/tournaments/:id/announce                                                 → { messageId }
```

### Bot ← Web endpoints (push, optional for this feature)

```
POST {BOT_BASE}/announce   { kind:"tournament", tournamentId, channelId? }
        // post/edit bracket + standings; mention linked members
```

> No `/api/bot/tournament-requests` — entrants are admin-entered. Bot is **announce-only** here.

### DTO

```ts
type Entrant  = { entrantId: string; name: string; memberId?: string | null; seed: number };
type Match    = { matchId: string; round: "r1"|"r2"|"final"; slot: number;
                  aId: string|null; bId: string|null;
                  scoreA: number|null; scoreB: number|null; winnerId: string|null };
type Standing = { entrantId: string; points: number; gameWins: number; rank: number|null };
type Tournament = {
  id: string; title: string; description?: string|null; startAt: string;
  gameType: "co5quan";
  status: "draft"|"seeded"|"r1_done"|"r2_done"|"final"|"completed";
  entrants: Entrant[];
  rounds: { r1: Match[]; r2: Match[]; final: Match[] };
  standings: Standing[]|null;
  placements: { first?: string; second?: string; third?: string };
  announceMessageId?: string|null;
};
```

---

## 5. Admin dashboard — `Giải Đấu` tab

Route: `/admin/tournaments` (new tab beside Members / Dungeons / Raids / 3v3 / Join Requests).

**List view:** tournaments sorted by `startAt`; status badge; entrant count; round progress
(e.g. "R2 · 3/5 played"). "Create" opens a form (`title`, `description`, `startAt`).

**Detail view (one tournament):**

1. **Entrants panel** — a 20-row editor (textarea or 20 inputs). Live counter "N/20".
   Optional per-row member link (typeahead against synced members → enables avatar/mention).
   "Save entrants" (PUT) enabled only at exactly 20.

2. **Seed button** — disabled until 20 saved. On click (reset-confirm if already seeded)
   calls `seed`; renders the Round 1 bracket.

3. **Bracket view** (the poster UI) — left column = R1 (10 matches), connector lines into
   middle column = R2 (5 matches), right = final group. Each match card shows the two names,
   a **score input `[A] – [B]`** (BO3), and a ✅ when valid. Recording a valid score highlights
   the winner and **auto-fills** the next-round slot. Use the same brush/ink aesthetic as the
   poster (scroll banner, cherry-blossom frame) via ui-ux-pro-max tokens.

4. **Final round-robin panel** — appears at `r2_done`. A 5×5 grid (or list of the 10 matches)
   with score inputs; a live **standings table** (name · points · game-wins · rank).

5. **Finalize** button — enabled when all 10 final matches recorded; computes placements;
   shows the **podium (1/2/3)**. Tie-breaks surfaced with a manual-override prompt if needed.

6. **Announce** button — posts/edits the Discord announcement.

7. Status control reflects lifecycle; destructive actions (re-seed, delete) behind confirm.

> Build this tab with the **ui-ux-pro-max** skill, reusing the established design system/tokens.
> The bracket connectors and ink/scroll styling should match the attached poster.

---

## 6. Discord bot (announce-only)

On admin "Announce", web posts to bot `/announce` with `kind:"tournament"`. Bot sends/edits
an embed in the configured channel:
- Title, date/time (`Asia/Ho_Chi_Minh`), description, and the **luật chơi** summary.
- Current stage: R1/R2 pairings + scores, or final standings table once available.
- @mention entrants that have a linked `memberId`; plain names otherwise.
- Save returned `messageId` → `announceMessageId`; later announces **edit** the same message.

No new member-facing command (entrants are admin-entered). `/myplan` is **not** extended.

---

## 7. Edge cases

- Entrant count ≠ 20 → seed disabled / 422.
- Duplicate names allowed (disambiguate by linked member or seed); warn on exact dupes.
- Invalid BO3 score (`1-1`, `3-0`, `2-2`) → 422.
- Editing an R1 result after R2 started → re-derive R2 pairing; if a now-changed winner already
  has R2/final results, **confirm + cascade-clear** affected downstream matches.
- Re-seed after results exist → wipe all rounds (confirm), back to `seeded`.
- Final round-robin tie on points → apply tie-break chain (H2H → game-wins → manual).
- Announce after edits → edit existing `announceMessageId` message.
- Member-linked entrant left the guild → mention falls back to plain name.

---

## 8. Build order

1. `tournaments` schema + zod/Mongoose models (TS) — no `joinRequests` change.
2. Admin API routes: CRUD, entrants (PUT), seed (shuffle+pair), match PATCH (validate+advance),
   finalize (standings+placements).
3. Round-derivation helpers (R1→R2 pairing, R2→final round-robin generator, standings/tie-break)
   — shared, unit-tested.
4. `/admin/tournaments` tab UI (ui-ux-pro-max): list, entrants editor, bracket, round-robin,
   podium.
5. Bot `/announce` for `kind:"tournament"` (embed with stage-aware rendering + mentions + edit).
6. QA: 20-seed randomness, BO3 validation, auto-advance, edit-cascade, round-robin scoring,
   tie-break, announce-edit.

---

## 9. Pending from owner

- **Tie-break rule** for the final round-robin (proposed: head-to-head → total game wins →
  manual). Confirm or override.
- **Discord channel ID** for tournament announcements (or reuse the raids/3v3 channel?).
- Whether entrants should be **manual-only** (current plan) or also allow a future `/giaidau`
  bot join command (out of scope now; noted for later).
- Default **title scheme** (e.g. "Giải Đấu Cờ 5 Quân Tuần N") — defaulting to free-text.
- Whether to **link entrants to members** by default (for avatars/mentions) or keep names free.
