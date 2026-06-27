# 09 — Feature: 3v3 Battle Events (UPDATE — Tournament Mode)

> **This is an update to the existing 3v3 Battle Events feature**, not a new feature.
> Collection, field, and join-request names are **unchanged** (`battleEvents`,
> `joinRequests.targetType="battle"`, `battleEventId`). The change is **additive**:
> the free-form per-team `score` is **replaced** by a two-stage tournament structure
> (group round-robin + best-of-5 final). Everything else (pool, random team generation,
> rename, announce, bot join flow) stays as-is.

## What changes vs. the current 3v3

| Area | Before (current) | After (this update) |
|------|------------------|---------------------|
| Scoring | `team.score` free-form, admin clicks "win" → +1 | **Removed.** Group matchups (W/D/L → 3/1/0) + best-of-5 final |
| Status enum | `draft` → `open` → `teams_generated` | add `group_stage`, `final_stage`, `completed` |
| `battleEvents.teams[]` | `{ teamId, name, memberIds, score }` | `score` → **`groupPoints`** (derived) |
| New embedded data | — | `groupMatchups[]`, `final`, `championTeamId` |
| Admin UI | team cards + win/undo buttons | pool → teams → **group grid + standings** → **final** |
| Collection name | `battleEvents` | **unchanged** |
| `joinRequests` extension | `targetType`, `battleEventId` | **unchanged** |

The tournament runs in **two stages**:
- **Stage 1 — Group (round-robin):** every team plays every other team. Each matchup is
  **2 rounds aggregated into one result**: win = 3, draw = 1, loss = 0. Top **2** advance.
- **Stage 2 — Final (best-of-5):** the 2 qualifiers play **5 rounds**; most round-wins = champion.

> Conventions unchanged: Pattern B (bot ↔ web via `/api/bot/*` + `X-Bot-Secret`; web pushes to
> bot `/notify`), UTC storage / `Asia/Ho_Chi_Minh` display, ui-ux-pro-max for the admin tab.

---

## 1. Glossary additions

- **Battle Event** — (existing) an internal 3v3 event with a participant pool and generated teams.
  Now also carries a group stage and a final.
- **Matchup (group)** — a pairing of two teams in Stage 1, played as 2 rounds, recorded as a
  single result: win / draw / loss.
- **Final series** — the Stage 2 best-of-5 between the top 2 teams.
- (**Battle Team**, **Participant** — unchanged from the existing feature.)

---

## 2. Business rules

### Pool & team generation (unchanged)
- Pool size must be **divisible by 3** (`count % 3 === 0`, count >= 6 so >= 2 teams).
  Example: 18 participants -> **6 teams**.
- Generation is **random**: shuffle the pool, slice into groups of 3.
- Re-generating reshuffles and **resets all stage data** (group + final) — confirm dialog.
  Lock regeneration once a result is recorded unless admin confirms reset.
- Team `name` editable any time (default `Team N`).
- A Member appears in at most one team.

### Stage 1 — Group (round-robin)  *(replaces free-form scoring)*
- Schedule = every unordered team pair once: **T*(T-1)/2** matchups (6 teams -> **15**).
  Each matchup = 2 rounds, recorded as **one aggregated result**.
- Admin records each matchup as **win / draw / loss** (relative to team A):
  - win  -> A +3, B +0
  - draw -> A +1, B +1
  - loss -> A +0, B +3
- Team **`groupPoints`** = sum across its matchups (derived/denormalized for display).
- **Ranking:** by `groupPoints` desc. **Tie-break: admin picks manually.** Top **2** advance.
- Stage 1 complete when all T*(T-1)/2 matchups have a result.

### Stage 2 — Final (best-of-5)
- The 2 qualifiers play **5 rounds**; admin records each round winner.
- **Champion** = most round-wins (first to 3 clinches; remaining rounds optional).
- `status -> completed`, set `championTeamId`.

---

## 3. Data model (changes to `battleEvents`)

> Collection name **unchanged**. Below: only the diffs from the current schema.

### `battleEvents` — modified/added fields

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `status` | string | **extended** | add `group_stage` \| `final_stage` \| `completed` to existing `draft`\|`open`\|`teams_generated` |
| `teams[].score` | number | **removed** | replaced by `groupPoints` |
| `teams[].groupPoints` | number | **added** | default 0, derived from matchups |
| `groupMatchups` | Matchup[] | **added** | generated with teams; one per team pair |
| `final` | Final \| null | **added** | set on entering Stage 2 |
| `championTeamId` | string \| null | **added** | set on completion |

Unchanged: `_id`, `title`, `description`, `startAt`, `participants[]`,
`teams[].{teamId,name,memberIds}`, `announceMessageId`, timestamps.

**Matchup (embedded):**
| Field | Type | Notes |
|-------|------|-------|
| `matchupId` | string | nanoid |
| `teamAId` | string | -> team.teamId |
| `teamBId` | string | -> team.teamId |
| `result` | string \| null | `a_win` \| `draw` \| `b_win` \| null (unplayed) |

**Final (embedded, best-of-5):**
| Field | Type | Notes |
|-------|------|-------|
| `teamIds` | string[] | the 2 qualifiers (admin-confirmed) |
| `rounds` | (string \| null)[] | length 5; each = winning `teamId` or null |
| `roundWins` | `{ [teamId]: number }` | derived tally |

```jsonc
{
  "title": "Ty Thi Tuan 3",
  "startAt": "2026-06-21T13:00:00Z",
  "status": "group_stage",
  "participants": ["m1","...","m18"],          // 18 -> 6 teams
  "teams": [
    { "teamId":"t1","name":"Hac Long","memberIds":["m3","m1","m5"],"groupPoints":6 },
    { "teamId":"t2","name":"Team 2","memberIds":["m2","m6","m4"],"groupPoints":4 }
    // ... t3..t6   (note: score removed, groupPoints added)
  ],
  "groupMatchups": [
    { "matchupId":"g1","teamAId":"t1","teamBId":"t2","result":"a_win" },
    { "matchupId":"g2","teamAId":"t1","teamBId":"t3","result":"draw" }
    // ... 15 total
  ],
  "final": null,
  "championTeamId": null,
  "announceMessageId": "123456789"
}
```

### Migration
- Existing events: drop `teams[].score`, add `teams[].groupPoints = 0`, `groupMatchups = []`,
  `final = null`, `championTeamId = null`. Events still in `teams_generated` stay valid
  (group stage simply not started).

### `joinRequests` — **unchanged**
`targetType: "raid"|"battle"`, `battleEventId`, approve -> push into
`battleEvents.participants`. No changes in this update.

---

## 4. API contract (changes)

> Base paths **unchanged** (`/api/battles`, `/api/bot/battles/*`). Removed the win endpoint;
> added matchup / advance-final / final-round endpoints.

### Admin endpoints

```
// unchanged
POST   /api/battles                              { title, description?, startAt }     -> BattleEvent
GET    /api/battles                              ?status=                             -> BattleEvent[]
GET    /api/battles/:id                                                               -> BattleEvent
PATCH  /api/battles/:id                          { title?, description?, startAt?, status? } -> BattleEvent
DELETE /api/battles/:id                                                               -> { ok }
POST   /api/battles/:id/participants             { memberId }                         -> BattleEvent
DELETE /api/battles/:id/participants/:memberId                                        -> BattleEvent
POST   /api/battles/:id/generate-teams           { confirmReset?: boolean }           -> BattleEvent
PATCH  /api/battles/:id/teams/:teamId            { name }                             -> BattleEvent
POST   /api/battles/:id/announce                                                      -> { messageId }

// REMOVED
- POST /api/battles/:id/teams/:teamId/win

// ADDED — Stage 1
PATCH  /api/battles/:id/matchups/:matchupId      { result: "a_win"|"draw"|"b_win"|null } -> BattleEvent
POST   /api/battles/:id/advance-final            { teamIds: [string,string] }         -> BattleEvent
        // admin-confirmed top 2 (manual tie-break). 422 if group stage incomplete.

// ADDED — Stage 2
PATCH  /api/battles/:id/final/rounds/:index      { winnerTeamId: string|null }        -> BattleEvent
        // index 0..4; recomputes roundWins; sets championTeamId + status=completed when decided
```

### Bot ↔ Web — **unchanged**
```
GET  /api/bot/battles/upcoming                                 -> BattleEvent[] (now -> end of week)
POST /api/bot/battle-requests   { battleEventId, discordId }   -> JoinRequest (pending, targetType=battle)
POST {BOT_BASE}/announce  { kind:"battle", battleEventId, channelId? }
POST {BOT_BASE}/notify    { kind:"battle_decision", discordId, battleTitle, approved }
```

### DTO (updated)
```ts
type BattleTeam = { teamId: string; name: string; memberIds: string[]; groupPoints: number }; // was: score
type Matchup = { matchupId: string; teamAId: string; teamBId: string; result: "a_win"|"draw"|"b_win"|null };
type Final = { teamIds: string[]; rounds: (string|null)[]; roundWins: Record<string, number> };
type BattleEvent = {
  id: string; title: string; description?: string|null; startAt: string;
  status: "draft"|"open"|"teams_generated"|"group_stage"|"final_stage"|"completed";
  participants: string[]; teams: BattleTeam[];
  groupMatchups: Matchup[]; final: Final|null; championTeamId?: string|null;
  announceMessageId?: string|null;
};
```

---

## 5. Admin dashboard — `3v3` tab (update)

Route **unchanged**: `/admin/battles`.

**List view (unchanged shape):** add a champion badge when `status=completed`.

**Detail view — replace the old "team cards + win/undo" with stage-aware sections:**

1. **Pool panel** *(unchanged)* — searchable member picker, chips to remove, live `N % 3` hint
   ("18 -> 6 teams"), pending battle join-requests surface here to approve.
2. **Generate teams** *(unchanged)* — disabled until pool valid; confirm-reset if results exist;
   renders team cards (editable `name`, 3 members w/ avatar + class icon).
3. **Group stage** *(new — replaces win buttons)* — matchup grid of all T*(T-1)/2 pairings;
   each row Team A vs Team B with a 3-way toggle **A win / Draw / B win** (writes `result`).
   Live **standings table** ranks by `groupPoints`. When all matchups recorded, show
   **"Pick top 2 -> Final"** (manual tie-break) -> `advance-final`.
4. **Final (best-of-5)** *(new)* — 5 round slots; admin picks each round winner; live `roundWins`;
   champion banner once a team reaches 3.
5. **Announce** *(unchanged)* — posts/edits the Discord announcement.

> ui-ux-pro-max, same tokens as the rest of admin. Confirm dialogs on regenerate-reset + delete.

---

## 6. Discord bot (update)

- **`/battle` command + join flow — unchanged.**
- **Announcement embed — extended:** add a **standings** field during group stage
  (team — points) and a **champion** highlight when completed. Still edits the same
  `announceMessageId` message. Teams-generated view (name + @mentions per team) unchanged.

| Command | Who | Effect |
|---------|-----|--------|
| `/battle` | member | browse upcoming 3v3 events + request to join *(unchanged)* |
| (reused) `/myplan` | member | optionally list battle events they're in |

---

## 7. Edge cases (additions for tournament mode)

- Pool not divisible by 3 -> generate disabled (422). *(existing)*
- < 2 teams (pool < 6) -> block generation.
- Editing pool after generation -> requires regenerate (resets stage data, with confirm).
- `advance-final` before all group matchups recorded -> 422.
- Best-of-5 clinched at 3-0 / 3-1 -> remaining rounds optional; champion set immediately.
- Changing a group `result` after `advance-final` -> warn; recompute standings; if it changes
  the top 2, require re-confirming finalists (resets `final`).
- Duplicate join request, member-left-guild/DM-closed, soft-deleted members -> unchanged.

---

## 8. Build order (delta from current)

1. **Schema migration**: drop `teams[].score`; add `groupPoints`, `groupMatchups[]`, `final`,
   `championTeamId`; extend `status` enum.
2. **API**: remove `/win`; add `/matchups/:matchupId`, `/advance-final`, `/final/rounds/:index`;
   `generate-teams` now also scaffolds empty `groupMatchups`.
3. **Admin UI**: replace win buttons with group grid + standings + final sections.
4. **Bot**: extend announce embed (standings + champion). Join flow untouched.
5. **QA**: migration of existing events, 15-matchup completeness, manual tie-break,
   advance-final guard, best-of-5 champion logic, result-change cascade, regenerate-reset.

---

## 9. Pending from owner

- Discord **channel ID** for battle announcements (or reuse the raids channel?). *(still open)*
- Default team-naming scheme — defaulting to `Team N`. *(still open)*
- Whether `/myplan` should include battle events (assumed yes). *(still open)*
- Should each matchup's **2 group rounds** ever be recorded individually (per-round stats), or is
  the single aggregated W/D/L sufficient (current assumption)?
