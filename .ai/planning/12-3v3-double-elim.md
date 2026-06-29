# 12 — 3v3 Battle: range-balanced teams + Bo3 double-elimination bracket

> **Additive update** to the 3v3 feature (`08`, `10`, `11`). Two team-generation upgrades plus a
> new competition format. The existing round-robin + Bo5-final flow is **kept unchanged** and
> selectable; the new double-elimination bracket is an alternative the admin picks per event.

## 1. Why

- A team of `[1 Tố Vấn + 2 random]` can be lopsided (e.g. 2 long-range + no melee). Composition
  should pair **one long-range + one short-range** class around the Tố Vấn for balanced fights.
- Single-game matchups are swingy. Series should be **best-of-3** (best-of-5 for the title match).
- The owner wants a real **double-elimination bracket** (the narrative below is the 8-team case).

Locked decisions (owner, 2026-06-29):
- **Two formats, admin picks at create:** `round_robin` (existing) | `double_elim` (new).
- **Bracket supports power-of-two team counts ≥ 4** (T ∈ {4, 8, 16} → 12 / 24 / 48 participants).
- **Per-game winner input**, series winner derived at clinch (2 in Bo3, 3 in Bo5).
- **Standard double-elim LB wiring** — an extra LB minor round (2→1) precedes the Losers' Final.
- **Range balancing is best-effort**; the Tố Vấn rule stays a hard block (see `11`).
- **Bo3 applies to `double_elim` only** — `round_robin` keeps single win/draw/loss recording.

## 2. Range-balanced team generation (both formats)

`NSNL_CLASSES` already carries `range: "long" | "short"` per class
([web/lib/classes.ts](../../web/lib/classes.ts)). Tố Vấn's own range is irrelevant — it always
fills the dedicated healer slot.

- `rangeForClassIcon(classIcon)` → `"long" | "short" | null` (null = unknown/missing = **flex**).
- `PoolMember` gains `range`. `generateBalancedTeams` (precondition `isBalanceable`, unchanged):
  1. One Tố Vấn per team (hard requirement).
  2. Split the `2T` non-Tố Vấn into `longs` / `shorts` / `flex`, each shuffled.
  3. Each team takes `first` (prefer long → flex → short) + `second` (prefer short → flex → long).
     When a range bucket is exhausted the fallback yields **2-long / 2-short** teams; the number
     of doubled teams equals `|longCount − T|`. Flex members fill the deficient side first.
  4. Shuffle each team's three members for display order.

## 3. Double-elimination bracket (`double_elim`)

For `T = 2^k` teams (`k ≥ 2`):
- **Winners' bracket** — `k` rounds, halving to the WB final (WB champion → Grand Final).
- **Losers' bracket** — standard ladder, alternating **minor** rounds (LB survivors pair off) and
  **major** rounds (minor winners vs that WB round's dropdowns), down to one LB champion.
- **Grand Final (Bo5)** — WB champion vs LB champion. (Single GF; no bracket reset — out of scope.)
- All non-GF matches are **Bo3**.

**Worked example, T=8** (matches the owner's narrative): WB 4+2+1 = 7, LB 2+2+1+1 = 6, GF 1 → **14
matches**. WB R1 losers → LB R1 (4→2); LB R2 = those 2 vs the 2 WB R2 losers (→2); LB R3 minor
(2→1); LB Final = that survivor vs the WB-final dropdown; GF.

### Data shape — `web/lib/battle.ts` + `web/lib/models/BattleEvent.ts`

Each `BracketMatch` stores **sources** describing where its participants come from, plus the
**resolved** participants and recorded games:

```
matchId, bracket: "WB"|"LB"|"GF", label, order, bestOf,
aSource / bSource: { kind:"seed", teamId } | { kind:"winner"|"loser", matchId },
aTeamId / bTeamId: string | null,   // derived
rounds: (teamId | null)[],          // per-game winner, length === bestOf
winnerTeamId: string | null,        // derived (clinchWins(bestOf))
```

- `buildDoubleElimBracket(teams)` emits matches in **dependency order** (every source references an
  earlier match) so resolution is a single forward pass.
- `deriveBracket(matches)` recomputes `aTeamId`/`bTeamId` from sources, derives `winnerTeamId`, and
  **cascade-clears** any match whose participants change (or whose recorded winner is no longer a
  participant) — same pattern as `deriveBracket` in `web/lib/tournament.ts`. Returns
  `{ matches, status, championTeamId }` (`championTeamId` = GF winner).

## 4. API & model

- `BattleEvent`: new `format` (`round_robin` default), new `bracket: { matches[] }` (null unless
  double-elim), new status `bracket_stage`. `championTeamId` reused for both formats.
- `POST /api/admin/battles` / `PATCH /…/:id` accept `format`.
- `POST /…/:id/generate-teams` — loads `range`, runs `generateBalancedTeams`; for `double_elim`
  validates `isPowerOfTwoTeamCount(T)` (422 `invalid-bracket-size` otherwise) and stores
  `bracket = { matches: buildDoubleElimBracket(teams) }` (and `groupMatchups: []`). Confirm-reset
  guard also covers recorded bracket games.
- `PATCH /…/:id/bracket/matches/:matchId/games/:index` — body `{ winnerTeamId: string | null }`;
  validates the winner is a current participant, sets the game, runs `deriveBracket`, persists
  matches + derived `status`/`championTeamId`. Bracket analogue of `…/final/rounds/:index`.
- Round-robin routes (`matchups*`, `advance-final`, `final/rounds/*`) are unchanged and used only
  when `format === "round_robin"`.

## 5. Admin UI — `web/components/admin/BattlePanel.tsx`

- Create form: **format** `<select>`.
- Pool panel: for `double_elim`, show a power-of-two team-count chip ("Cần 4/8/16 đội") beside the
  Tố Vấn tally; **Generate** disabled unless both the Tố Vấn count and bracket size are valid.
- `BracketSection` (when `event.bracket`): three columns (Nhánh thắng / Nhánh thua / Chung kết
  tổng), each match shows both teams + win tallies + a per-game `ResultButton` row (reusing the
  final's click pattern). Champion banner reuses the `Trophy` treatment. Group-stage + `FinalSection`
  render only for `round_robin`.

## 6. Out of scope (v1)
- Grand-final bracket reset (LB champion would need to win twice).
- Public arena page / Discord bracket-result announcing — rosters still render fine.

## 7. Edge cases
- Pool not divisible by 3 → existing 422 (first). Wrong Tố Vấn count → existing 422.
- `double_elim` with a non-power-of-two team count → 422 `invalid-bracket-size`.
- Editing an early game that flips a series winner → downstream matches cascade-clear via
  `deriveBracket` (silent, like Cờ 5 Quân).
- Re-generate recomputes teams + a fresh bracket; confirm-reset required if any game was recorded.
- Member soft-deleted / null class after pool edit → counts as non-Tố Vấn + flex range (read live).
