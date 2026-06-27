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

/**
 * Randomly forms teams from a participant pool: shuffle, slice into groups of
 * {@link BATTLE_TEAM_SIZE}, naming them `Team 1..N`. Caller must validate the
 * pool size first ({@link isGeneratablePool}).
 */
export function generateTeams(participantIds: readonly string[]): BuiltTeam[] {
  const shuffled = shuffle(participantIds);
  const teams: BuiltTeam[] = [];
  for (let i = 0; i < shuffled.length; i += BATTLE_TEAM_SIZE) {
    teams.push({
      teamId: newId(),
      name: `Team ${teams.length + 1}`,
      memberIds: shuffled.slice(i, i + BATTLE_TEAM_SIZE),
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
