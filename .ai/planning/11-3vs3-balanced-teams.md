# 11 — 3v3 Battle: class-balanced team generation (1 Tố Vấn per team)

> **Additive update to the existing 3v3 feature** (`.ai/planning/10-3vs3-battle-feature.md`).
> Only **team generation** changes. Collections, fields, statuses, matchup/final logic,
> bot flow, and all other endpoints stay **unchanged**.
>
> The pure-random shuffle is **replaced** (no toggle) by a **class-aware** generator that
> guarantees **exactly one Tố Vấn per team**. Generation is **blocked** unless the pool
> contains **exactly `T` Tố Vấn**, where `T = pool size ÷ 3`.

## 1. Why

Tố Vấn (`classIcon: "ToVan"`) is NTH's healer/support. A 3v3 team without one — or with two —
is unbalanced. Teams should each field **exactly one** Tố Vấn so every match is fair.

Locked decisions (owner, 2026-06-28):
- **Block + require exactly `T`** Tố Vấn. Not best-effort, not "≥1".
- **Replace** the random path entirely. No "pure random vs balanced" toggle — generation
  is always class-aware.

## 2. Rule

For a pool of `N` participants (`N % 3 === 0`, `N >= 6`, so `T = N/3` teams):

| Condition | Behavior |
|-----------|----------|
| `tovanCount === T` | ✅ generate — each team gets 1 Tố Vấn + 2 others |
| `tovanCount < T`   | ❌ 422 — not enough Tố Vấn |
| `tovanCount > T`   | ❌ 422 — too many Tố Vấn (would force a 2nd onto some team) |

- **Tố Vấn identity:** a participant is a Tố Vấn iff `member.classIcon === "ToVan"` (the
  canonical asset key from `web/lib/classes.ts` — the stable source of truth, never the
  free-text `class` name). A participant whose member is missing / soft-deleted / has a
  null class counts as **non-Tố Vấn**.
- Everything else about pool validity is unchanged (`isGeneratablePool`).
- Re-generate semantics (reshuffle, reset stage data, confirm if results exist) — unchanged.

## 3. Algorithm

Each team = `[1 Tố Vấn] + [2 non-Tố Vấn]`, all chosen randomly.

```
generateBalancedTeams(pool):           # pool: { memberId, isTovan }[]
  T       = pool.length / 3
  tovan   = shuffle(pool where isTovan)        # length must === T (precondition)
  others  = shuffle(pool where !isTovan)       # length === 2T
  teams = []
  for i in 0..T-1:
    members = shuffle([ tovan[i], others[2i], others[2i+1] ])  # mix display order
    teams.push({ teamId, name: `Team ${i+1}`, memberIds: members, groupPoints: 0 })
  return teams
```

- Both lists are shuffled before slicing → team composition is random.
- Inner `shuffle` of each team's 3 members so the Tố Vấn isn't always rendered first.
- Caller (route) must validate `tovan.length === T` first; the function asserts it and
  throws on mismatch (defensive — the route returns 422 before reaching here).

## 4. Code changes

### `web/lib/classes.ts`
Add the canonical key + a helper (single source of truth):
```ts
/** Asset key of the Tố Vấn (healer/support) class — used by 3v3 team balancing. */
export const TOVAN_ICON_KEY = "ToVan";
export function isTovanIcon(classIcon?: string | null): boolean {
  return classIcon === TOVAN_ICON_KEY;
}
```

### `web/lib/battle.ts`
Replace `generateTeams(participantIds)` with a class-aware version:
```ts
export type PoolMember = { memberId: string; isTovan: boolean };

/** Count of Tố Vấn in the pool. */
export function tovanCount(pool: readonly PoolMember[]): number {
  return pool.filter((p) => p.isTovan).length;
}

/** Exactly one Tố Vấn per team is achievable iff tovanCount === pool/teamSize. */
export function isBalanceable(pool: readonly PoolMember[]): boolean {
  return isGeneratablePool(pool.length) &&
         tovanCount(pool) === pool.length / BATTLE_TEAM_SIZE;
}

/** Forms teams of [1 Tố Vấn + 2 others], all random. Precondition: isBalanceable. */
export function generateBalancedTeams(pool: readonly PoolMember[]): BuiltTeam[] { /* §3 */ }
```
- Keep `shuffle`, `isGeneratablePool`, `buildGroupMatchups`, scoring/final helpers as-is.
- Remove the old `generateTeams` (no callers after the route updates).

### `web/app/api/admin/battles/[id]/generate-teams/route.ts`
After the existing `isGeneratablePool` check, before building teams:
1. Load participant classes:
   `Member.find({ _id: { $in: event.participants } }).select("_id classIcon")`.
2. Build `pool: PoolMember[]` — `isTovan: isTovanIcon(m.classIcon)`; participants with no
   loaded member default to `isTovan: false`.
3. Guard:
   ```ts
   const T = event.participants.length / BATTLE_TEAM_SIZE;
   const tovan = tovanCount(pool);
   if (tovan !== T) {
     return NextResponse.json({
       error: tovan < T ? "not-enough-tovan" : "too-many-tovan",
       message: `Cần đúng ${T} Tố Vấn cho ${T} đội (hiện có ${tovan}).`,
     }, { status: 422 });
   }
   ```
4. `const teams = generateBalancedTeams(pool);` — rest of the route (matchups, `$set`,
   status `teams_generated`) unchanged.

> The 409 confirm-reset check stays exactly where it is. Order: pool divisible → load
> classes → Tố Vấn count guard → confirm-reset → build.

No schema, DTO, validator (`generateTeamsSchema` keeps just `confirmReset?`), or status
changes. `groupMatchups` / `final` / scoring untouched.

## 5. Admin UI (`web/components/admin/BattlePanel.tsx`)

Pool panel — make the constraint visible **before** the admin clicks Generate:
- Next to the existing "18 → 6 đội" hint, show a Tố Vấn tally: **"Tố Vấn: 5 / 6"**,
  green when equal, red/amber when not. Disable **Generate teams** unless `tovan === T`.
- On a 422 (`not-enough-tovan` / `too-many-tovan`), surface the `message` inline.
- Team cards already show each member's class icon — the single Tố Vấn per card is now a
  visible invariant (no new component needed).

ui-ux-pro-max, same admin tokens. No other UI changes.

## 6. Edge cases

- **Pool not divisible by 3** → existing 422, unchanged (checked first).
- **Exactly `T` Tố Vấn but a non-Tố Vấn member soft-deleted between pool edit and generate**
  → `Member.find` omits it → counted as non-Tố Vấn → counts still derived live, guard re-runs.
- **Member's class changed after joining the pool** → class is read live at generation time,
  so the count always reflects current `classIcon`.
- **Re-generate** → recomputes pool/count each call; same guard applies (a pool that was
  balanceable can become unbalanceable if classes changed — that's correct, block it).
- **More than `T` Tố Vấn** → blocked (we never silently drop the constraint to "≤2/team").
- Duplicate join request / DM-closed / announce flow → unchanged.

## 7. Build order

1. `classes.ts`: add `TOVAN_ICON_KEY` + `isTovanIcon`.
2. `battle.ts`: add `PoolMember`, `tovanCount`, `isBalanceable`, `generateBalancedTeams`;
   remove `generateTeams`.
3. `generate-teams` route: load classes, add Tố Vấn-count guard, call `generateBalancedTeams`.
4. `BattlePanel`: Tố Vấn tally + Generate-disabled state + 422 messages.
5. QA: exactly-`T` happy path (each team has 1 Tố Vấn), too-few 422, too-many 422,
   re-generate reshuffles with constraint intact, soft-deleted/null-class participant counted
   as non-Tố Vấn, randomness (Tố Vấn not always team-member #1).

## 8. Pending from owner

- Future classes to balance on besides Tố Vấn (e.g. cap tanks/dps per team)? — out of scope
  for v1; the `PoolMember` shape can grow a `role`/`classIcon` field later without a rewrite.
