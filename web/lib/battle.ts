import { randomUUID } from "node:crypto";

import {
  BATTLE_TEAM_SIZE,
  BRACKET_BEST_OF,
  clinchWins,
  FINAL_CLINCH_WINS,
  FINAL_ROUND_COUNT,
  GRAND_FINAL_BEST_OF,
} from "./models/BattleEvent";

/**
 * 3v3 battle tournament helpers — see `.ai/planning/10-3vs3-battle-feature.md`.
 * Pure functions, unit-testable; the API routes own persistence.
 *
 * Two stages:
 *  - Group (round-robin): every team pair plays once, recorded as win/draw/loss
 *    relative to team A (3/1/0 points).
 *  - Final (best-of-5): the top 2 qualifiers; most round-wins is champion.
 */

export type BuiltTeam = {
  teamId: string;
  name: string;
  memberIds: string[];
  groupPoints: number;
};

export type BuiltMatchup = {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  result: "a_win" | "draw" | "b_win" | null;
};

export type BuiltFinal = {
  teamIds: string[];
  rounds: (string | null)[];
  roundWins: Record<string, number>;
};

/** Stable id for an embedded team/matchup. */
export function newId(): string {
  return randomUUID();
}

/** Fisher–Yates shuffle (returns a new array; does not mutate input). */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** A pool is generatable only when divisible by the team size and >= 2 teams. */
export function isGeneratablePool(count: number): boolean {
  return count >= BATTLE_TEAM_SIZE * 2 && count % BATTLE_TEAM_SIZE === 0;
}

/**
 * A pool entry tagged with whether the member is a Tố Vấn (healer/support) and the
 * member's range classification (`"long" | "short" | null`, null = unknown/flex).
 */
export type PoolMember = {
  memberId: string;
  isTovan: boolean;
  range: "long" | "short" | null;
};

/** Number of Tố Vấn in the pool. */
export function tovanCount(pool: readonly PoolMember[]): number {
  return pool.reduce((n, p) => n + (p.isTovan ? 1 : 0), 0);
}

/**
 * Exactly one Tố Vấn per team is achievable iff the pool is generatable AND it
 * holds exactly `pool / BATTLE_TEAM_SIZE` Tố Vấn (one per team, no extras).
 */
export function isBalanceable(pool: readonly PoolMember[]): boolean {
  return (
    isGeneratablePool(pool.length) &&
    tovanCount(pool) === pool.length / BATTLE_TEAM_SIZE
  );
}

/**
 * Forms teams of `[1 Tố Vấn + 1 long-range + 1 short-range]`. Each team gets exactly
 * one Tố Vấn (hard requirement, see {@link isBalanceable}); the other two slots aim for
 * one long + one short. When a range bucket runs dry the remaining slots are filled from
 * the other bucket (→ 2-long / 2-short fallback teams), using unknown-range ("flex")
 * members first. All buckets are shuffled, so composition is random within the constraint;
 * each team's three members are shuffled for display order (Tố Vấn isn't always first).
 *
 * Precondition: {@link isBalanceable}. Throws on a Tố Vấn-count mismatch — the caller
 * (route) is expected to validate and return 422 before reaching here.
 */
export function generateBalancedTeams(pool: readonly PoolMember[]): BuiltTeam[] {
  const teamCount = pool.length / BATTLE_TEAM_SIZE;
  const tovan = shuffle(pool.filter((p) => p.isTovan).map((p) => p.memberId));
  if (tovan.length !== teamCount) {
    throw new Error(
      `generateBalancedTeams: expected ${teamCount} Tố Vấn, got ${tovan.length}`
    );
  }

  const others = pool.filter((p) => !p.isTovan);
  const longs = shuffle(others.filter((p) => p.range === "long").map((p) => p.memberId));
  const shorts = shuffle(others.filter((p) => p.range === "short").map((p) => p.memberId));
  const flex = shuffle(others.filter((p) => p.range === null).map((p) => p.memberId));

  // Pull one member preferring `primary`, then a flex wildcard, then `secondary`.
  const take = (primary: string[], secondary: string[]): string => {
    const id = primary.pop() ?? flex.pop() ?? secondary.pop();
    if (id === undefined) {
      throw new Error("generateBalancedTeams: ran out of non-Tố Vấn members");
    }
    return id;
  };

  const teams: BuiltTeam[] = [];
  for (let i = 0; i < teamCount; i++) {
    const first = take(longs, shorts); // prefer long
    const second = take(shorts, longs); // prefer short
    const memberIds = shuffle([tovan[i], first, second]);
    teams.push({
      teamId: newId(),
      name: `Team ${i + 1}`,
      memberIds,
      groupPoints: 0,
    });
  }
  return teams;
}

/** Round-robin schedule: one matchup per unordered team pair (T*(T-1)/2). */
export function buildGroupMatchups(teams: readonly BuiltTeam[]): BuiltMatchup[] {
  const matchups: BuiltMatchup[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchups.push({
        matchupId: newId(),
        teamAId: teams[i].teamId,
        teamBId: teams[j].teamId,
        result: null,
      });
    }
  }
  return matchups;
}

/** Points per matchup result: win 3, draw 1, loss 0. */
export function computeGroupPoints(
  teams: readonly BuiltTeam[],
  matchups: readonly BuiltMatchup[]
): Record<string, number> {
  const points: Record<string, number> = {};
  for (const team of teams) points[team.teamId] = 0;
  for (const m of matchups) {
    if (m.result === "a_win") points[m.teamAId] += 3;
    else if (m.result === "b_win") points[m.teamBId] += 3;
    else if (m.result === "draw") {
      points[m.teamAId] += 1;
      points[m.teamBId] += 1;
    }
  }
  return points;
}

/** True when every group matchup has a recorded result. */
export function isGroupComplete(matchups: readonly BuiltMatchup[]): boolean {
  return matchups.length > 0 && matchups.every((m) => m.result !== null);
}

/** Tally round-wins per team across the best-of-5 final. */
export function computeRoundWins(rounds: readonly (string | null)[]): Record<string, number> {
  const wins: Record<string, number> = {};
  for (const winner of rounds) {
    if (winner) wins[winner] = (wins[winner] ?? 0) + 1;
  }
  return wins;
}

/**
 * Champion of a best-of-5 final, or null if undecided. A team clinches once it
 * reaches {@link FINAL_CLINCH_WINS} round-wins; remaining rounds are optional.
 */
export function decideChampion(rounds: readonly (string | null)[]): string | null {
  const wins = computeRoundWins(rounds);
  for (const [teamId, count] of Object.entries(wins)) {
    if (count >= FINAL_CLINCH_WINS) return teamId;
  }
  return null;
}

/** Builds the initial best-of-5 final between two confirmed qualifiers. */
export function buildFinal(teamIds: readonly [string, string]): BuiltFinal {
  return {
    teamIds: [...teamIds],
    rounds: Array(FINAL_ROUND_COUNT).fill(null),
    roundWins: { [teamIds[0]]: 0, [teamIds[1]]: 0 },
  };
}

// ---- Double-elimination bracket (format "double_elim") — see .ai/planning/12-3v3-double-elim.md ----

/** Where a bracket match's participant comes from: a seed team, or another match's winner/loser. */
export type MatchSource =
  | { kind: "seed"; teamId: string }
  | { kind: "winner"; matchId: string }
  | { kind: "loser"; matchId: string };

/** A single best-of-N series in the bracket. `aTeamId`/`bTeamId`/`winnerTeamId` are derived. */
export type BracketMatch = {
  matchId: string;
  bracket: "WB" | "LB" | "GF";
  label: string;
  order: number;
  /** 0-based column (round) within this match's bracket side — for tree layout. */
  round: number;
  /** 0-based row within the round — for tree layout. */
  slot: number;
  bestOf: number;
  aSource: MatchSource;
  bSource: MatchSource;
  aTeamId: string | null;
  bTeamId: string | null;
  rounds: (string | null)[];
  winnerTeamId: string | null;
};

/** Double-elim needs a power-of-two team count of at least 4 (4 / 8 / 16 → 12 / 24 / 48 players). */
export function isPowerOfTwoTeamCount(teamCount: number): boolean {
  return teamCount >= 4 && (teamCount & (teamCount - 1)) === 0;
}

/**
 * Builds a full single-Grand-Final double-elimination bracket for `T = 2^k` teams (k ≥ 2):
 * a Winners' bracket of `k` rounds, the standard Losers' ladder (alternating minor rounds —
 * LB survivors pairing off — and major rounds — survivors vs that round's WB dropdowns),
 * and a Bo5 Grand Final (WB champion vs LB champion). All other matches are Bo3.
 *
 * Matches are emitted in dependency order (every source references an earlier match), so
 * {@link deriveBracket} can resolve participants in a single forward pass.
 */
export function buildDoubleElimBracket(teams: readonly BuiltTeam[]): BracketMatch[] {
  const T = teams.length;
  if (!isPowerOfTwoTeamCount(T)) {
    throw new Error(`buildDoubleElimBracket: team count must be a power of two ≥ 4, got ${T}`);
  }
  const seeds = shuffle(teams.map((t) => t.teamId));
  const k = Math.round(Math.log2(T));
  const matches: BracketMatch[] = [];
  let order = 0;
  const mk = (
    bracket: BracketMatch["bracket"],
    label: string,
    roundIdx: number,
    slotIdx: number,
    bestOf: number,
    aSource: MatchSource,
    bSource: MatchSource
  ): BracketMatch => {
    const m: BracketMatch = {
      matchId: newId(),
      bracket,
      label,
      order: order++,
      round: roundIdx,
      slot: slotIdx,
      bestOf,
      aSource,
      bSource,
      aTeamId: null,
      bTeamId: null,
      rounds: Array(bestOf).fill(null),
      winnerTeamId: null,
    };
    matches.push(m);
    return m;
  };
  const winnerOf = (m: BracketMatch): MatchSource => ({ kind: "winner", matchId: m.matchId });
  const loserOf = (m: BracketMatch): MatchSource => ({ kind: "loser", matchId: m.matchId });

  // ---- Winners' bracket: k rounds, halving each time down to the WB final. ----
  const wbRounds: BracketMatch[][] = [];
  for (let r = 0; r < k; r++) {
    const count = T / 2 ** (r + 1);
    const label = r === k - 1 ? "Chung kết nhánh thắng" : `Nhánh thắng · Vòng ${r + 1}`;
    const round: BracketMatch[] = [];
    for (let i = 0; i < count; i++) {
      const [a, b] =
        r === 0
          ? ([{ kind: "seed", teamId: seeds[2 * i] }, { kind: "seed", teamId: seeds[2 * i + 1] }] as const)
          : ([winnerOf(wbRounds[r - 1][2 * i]), winnerOf(wbRounds[r - 1][2 * i + 1])] as const);
      round.push(mk("WB", label, r, i, BRACKET_BEST_OF, a, b));
    }
    wbRounds.push(round);
  }
  const wbFinal = wbRounds[k - 1][0];

  // ---- Losers' bracket: pending starts as the WB round-1 losers. ----
  let lbNo = 0;
  let pending: MatchSource[] = wbRounds[0].map((m) => loserOf(m));
  let lastLbMatch: BracketMatch | null = null;
  for (let r = 1; r < k; r++) {
    // Minor round: pair the current survivors among themselves.
    lbNo += 1;
    const minorLabel = `Nhánh thua · Vòng ${lbNo}`;
    const minorWinners: BracketMatch[] = [];
    for (let i = 0; i < pending.length / 2; i++) {
      minorWinners.push(
        mk("LB", minorLabel, lbNo - 1, i, BRACKET_BEST_OF, pending[2 * i], pending[2 * i + 1])
      );
    }
    // Major round: minor winners vs this WB round's dropdowns.
    lbNo += 1;
    const isLbFinal = r === k - 1;
    const majorLabel = isLbFinal ? "Chung kết nhánh thua" : `Nhánh thua · Vòng ${lbNo}`;
    const majorWinners: BracketMatch[] = [];
    for (let i = 0; i < minorWinners.length; i++) {
      majorWinners.push(
        mk("LB", majorLabel, lbNo - 1, i, BRACKET_BEST_OF, winnerOf(minorWinners[i]), loserOf(wbRounds[r][i]))
      );
    }
    pending = majorWinners.map((m) => winnerOf(m));
    lastLbMatch = majorWinners[majorWinners.length - 1];
  }
  const lbFinal = lastLbMatch!; // k ≥ 2 guarantees at least one LB round ran.

  // ---- Grand Final (Bo5): WB champion vs LB champion. ----
  mk("GF", "Chung kết tổng", 0, 0, GRAND_FINAL_BEST_OF, winnerOf(wbFinal), winnerOf(lbFinal));

  return matches;
}

/** Series winner of a recorded best-of-N match, or null if undecided / participants unknown. */
function deriveSeriesWinner(
  rounds: readonly (string | null)[],
  bestOf: number,
  aTeamId: string | null,
  bTeamId: string | null
): string | null {
  if (!aTeamId || !bTeamId) return null;
  const need = clinchWins(bestOf);
  let aWins = 0;
  let bWins = 0;
  for (const w of rounds) {
    if (w === aTeamId) aWins += 1;
    else if (w === bTeamId) bWins += 1;
  }
  if (aWins >= need) return aTeamId;
  if (bWins >= need) return bTeamId;
  return null;
}

export type DerivedBracket = {
  matches: BracketMatch[];
  status: "teams_generated" | "bracket_stage" | "completed";
  championTeamId: string | null;
};

/**
 * Recomputes every match's resolved participants and series winner from the recorded
 * per-game results, in a single forward pass (matches are stored in dependency order).
 * A match whose resolved participants change — or whose recorded game-winner is no longer
 * a participant — has its games cleared (cascade-clear), exactly like the Cờ 5 Quân
 * `deriveBracket` in `web/lib/tournament.ts`. The champion is the Grand Final winner.
 */
export function deriveBracket(input: readonly BracketMatch[]): DerivedBracket {
  const byId = new Map<string, BracketMatch>();
  const out: BracketMatch[] = [];
  let anyRecorded = false;

  const resolve = (s: MatchSource): string | null => {
    if (s.kind === "seed") return s.teamId;
    const src = byId.get(s.matchId);
    if (!src || !src.winnerTeamId) return null;
    if (s.kind === "winner") return src.winnerTeamId;
    // loser: the participant that isn't the winner.
    if (!src.aTeamId || !src.bTeamId) return null;
    return src.winnerTeamId === src.aTeamId ? src.bTeamId : src.aTeamId;
  };

  for (const m of input) {
    const aTeamId = resolve(m.aSource);
    const bTeamId = resolve(m.bSource);
    const participantsChanged = aTeamId !== m.aTeamId || bTeamId !== m.bTeamId;
    const base = participantsChanged ? Array<string | null>(m.bestOf).fill(null) : [...m.rounds];
    // Drop any recorded game whose winner is no longer one of the two participants.
    const rounds = base.map((w) => (w && w !== aTeamId && w !== bTeamId ? null : w));
    const winnerTeamId = deriveSeriesWinner(rounds, m.bestOf, aTeamId, bTeamId);
    if (rounds.some((w) => w !== null)) anyRecorded = true;
    const next: BracketMatch = { ...m, aTeamId, bTeamId, rounds, winnerTeamId };
    byId.set(next.matchId, next);
    out.push(next);
  }

  const championTeamId = out.find((m) => m.bracket === "GF")?.winnerTeamId ?? null;
  const status = championTeamId ? "completed" : anyRecorded ? "bracket_stage" : "teams_generated";
  return { matches: out, status, championTeamId };
}
