import { randomUUID } from "node:crypto";

import {
  BATTLE_TEAM_SIZE,
  FINAL_CLINCH_WINS,
  FINAL_ROUND_COUNT,
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

/** A pool entry tagged with whether the member is a Tố Vấn (healer/support). */
export type PoolMember = { memberId: string; isTovan: boolean };

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
 * Randomly forms teams of `[1 Tố Vấn + 2 others]`, naming them `Team 1..N`.
 * Both buckets are shuffled before slicing and each team's three members are
 * shuffled for display order (so the Tố Vấn isn't always first).
 *
 * Precondition: {@link isBalanceable}. Throws on a Tố Vấn-count mismatch — the
 * caller (route) is expected to validate and return 422 before reaching here.
 */
export function generateBalancedTeams(pool: readonly PoolMember[]): BuiltTeam[] {
  const teamCount = pool.length / BATTLE_TEAM_SIZE;
  const tovan = shuffle(pool.filter((p) => p.isTovan).map((p) => p.memberId));
  const others = shuffle(pool.filter((p) => !p.isTovan).map((p) => p.memberId));
  if (tovan.length !== teamCount) {
    throw new Error(
      `generateBalancedTeams: expected ${teamCount} Tố Vấn, got ${tovan.length}`
    );
  }

  const teams: BuiltTeam[] = [];
  for (let i = 0; i < teamCount; i++) {
    const memberIds = shuffle([tovan[i], others[2 * i], others[2 * i + 1]]);
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
