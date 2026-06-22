import { randomUUID } from "node:crypto";

/**
 * Cờ 5 Quân round-derivation helpers — see `.ai/planning/09-co-5-quan-feature.md`.
 * Pure functions, unit-testable; the API routes own persistence.
 */

export const ENTRANT_COUNT = 20;
export const R1_MATCH_COUNT = 10;
export const R2_MATCH_COUNT = 5;
export const FINAL_PLAYER_COUNT = 5;

export type SeedEntrant = { name: string; memberId: string | null };

export type BuiltEntrant = {
  entrantId: string;
  name: string;
  memberId: string | null;
  seed: number;
};

export type BuiltMatch = {
  matchId: string;
  round: "r1" | "r2" | "final";
  slot: number;
  aId: string | null;
  bId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
};

/** Stable id for an embedded entrant/match. */
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

/** Empty (unscored) match in a given round/slot. */
function emptyMatch(round: BuiltMatch["round"], slot: number, aId: string | null, bId: string | null): BuiltMatch {
  return { matchId: newId(), round, slot, aId, bId, scoreA: null, scoreB: null, winnerId: null };
}

/**
 * Seeds a tournament: shuffles the 20 entrants, assigns seeds 1..20 in shuffled
 * order, and builds the 10 Round-1 matches by pairing adjacent shuffled entrants.
 */
export function seedTournament(entrants: readonly SeedEntrant[]): {
  entrants: BuiltEntrant[];
  r1: BuiltMatch[];
} {
  const shuffled = shuffle(entrants);
  const built: BuiltEntrant[] = shuffled.map((e, i) => ({
    entrantId: newId(),
    name: e.name,
    memberId: e.memberId,
    seed: i + 1,
  }));

  const r1: BuiltMatch[] = [];
  for (let slot = 0; slot < R1_MATCH_COUNT; slot++) {
    r1.push(emptyMatch("r1", slot, built[slot * 2].entrantId, built[slot * 2 + 1].entrantId));
  }

  return { entrants: built, r1 };
}

/** Valid BO3 score pairs (loser ≤ 1). */
export function isValidBo3(scoreA: number, scoreB: number): boolean {
  const pairs = [
    [2, 0],
    [2, 1],
    [0, 2],
    [1, 2],
  ];
  return pairs.some(([a, b]) => a === scoreA && b === scoreB);
}

/** Winner of a recorded BO3 match, or null if not (validly) recorded. */
export function matchWinner(m: Pick<BuiltMatch, "aId" | "bId" | "scoreA" | "scoreB">): string | null {
  if (m.aId == null || m.bId == null || m.scoreA == null || m.scoreB == null) return null;
  if (!isValidBo3(m.scoreA, m.scoreB)) return null;
  return m.scoreA > m.scoreB ? m.aId : m.bId;
}

export type BuiltStanding = {
  entrantId: string;
  points: number;
  gameWins: number;
  rank: number | null;
};

/** Ordered winners of a fully-recorded round (by slot); null if any match is unrecorded. */
function orderedWinners(matches: readonly BuiltMatch[], count: number): string[] | null {
  const sorted = [...matches].sort((a, b) => a.slot - b.slot);
  if (sorted.length !== count) return null;
  const winners = sorted.map((m) => m.winnerId);
  if (winners.some((w) => !w)) return null;
  return winners as string[];
}

/** Number of validly-recorded matches in a round. */
export function countRecorded(matches: readonly BuiltMatch[]): number {
  return matches.filter((m) => m.winnerId).length;
}

/** R1 winners → 5 R2 matches, pairing adjacent winners by R1 standing order. */
function buildR2(winners: string[], existing: readonly BuiltMatch[]): BuiltMatch[] {
  const out: BuiltMatch[] = [];
  for (let slot = 0; slot < R2_MATCH_COUNT; slot++) {
    const aId = winners[slot * 2];
    const bId = winners[slot * 2 + 1];
    const prev = existing.find((m) => m.aId === aId && m.bId === bId);
    out.push(prev ? { ...prev, slot } : emptyMatch("r2", slot, aId, bId));
  }
  return out;
}

/** 5 finalists → round-robin of C(5,2)=10 matches (unordered pairs). */
function buildFinal(finalists: string[], existing: readonly BuiltMatch[]): BuiltMatch[] {
  const out: BuiltMatch[] = [];
  let slot = 0;
  for (let i = 0; i < finalists.length; i++) {
    for (let j = i + 1; j < finalists.length; j++) {
      const aId = finalists[i];
      const bId = finalists[j];
      const prev = existing.find(
        (m) =>
          (m.aId === aId && m.bId === bId) || (m.aId === bId && m.bId === aId)
      );
      out.push(prev ? { ...prev, slot } : emptyMatch("final", slot, aId, bId));
      slot++;
    }
  }
  return out;
}

/** Live round-robin standings (points = series wins, gameWins = total games). Rank set at finalize. */
export function computeStandings(
  finalists: string[],
  final: readonly BuiltMatch[]
): BuiltStanding[] {
  return finalists.map((id) => {
    let points = 0;
    let gameWins = 0;
    for (const m of final) {
      if (m.aId !== id && m.bId !== id) continue;
      const isA = m.aId === id;
      if (m.scoreA != null && m.scoreB != null) {
        gameWins += isA ? m.scoreA : m.scoreB;
      }
      if (m.winnerId === id) points += 1;
    }
    return { entrantId: id, points, gameWins, rank: null };
  });
}

/**
 * Ranks the 5 finalists for placement. Tie-break chain (spec §2):
 *   1) points (series wins), 2) head-to-head within the tied group,
 *   3) total game wins, 4) admin manual order (`manualOrder`).
 * Returns the ranked standings plus any sub-groups still tied after the
 * automatic chain (the caller prompts the admin when `unresolved` is non-empty).
 */
export function rankFinalists(
  finalists: string[],
  final: readonly BuiltMatch[],
  manualOrder?: string[]
): { standings: BuiltStanding[]; unresolved: string[][] } {
  const base = computeStandings(finalists, final);
  const byId = new Map(base.map((s) => [s.entrantId, s]));
  const pointTiers = [...new Set(base.map((s) => s.points))].sort((a, b) => b - a);

  const ordered: string[] = [];
  const unresolved: string[][] = [];

  for (const p of pointTiers) {
    const group = base.filter((s) => s.points === p).map((s) => s.entrantId);
    if (group.length === 1) {
      ordered.push(group[0]);
      continue;
    }

    // Head-to-head wins within the tied group only.
    const h2h = (id: string) =>
      group.reduce((n, g) => {
        if (g === id) return n;
        const m = final.find(
          (mm) =>
            (mm.aId === id && mm.bId === g) || (mm.aId === g && mm.bId === id)
        );
        return n + (m && m.winnerId === id ? 1 : 0);
      }, 0);

    const sub = [...group].sort(
      (a, b) => h2h(b) - h2h(a) || byId.get(b)!.gameWins - byId.get(a)!.gameWins
    );

    // Resolve runs still equal on (h2h, gameWins) via manualOrder, else flag.
    let i = 0;
    while (i < sub.length) {
      let j = i + 1;
      while (
        j < sub.length &&
        h2h(sub[j]) === h2h(sub[i]) &&
        byId.get(sub[j])!.gameWins === byId.get(sub[i])!.gameWins
      ) {
        j++;
      }
      if (j - i > 1) {
        const tie = sub.slice(i, j);
        if (manualOrder && tie.every((id) => manualOrder.includes(id))) {
          tie.sort((a, b) => manualOrder.indexOf(a) - manualOrder.indexOf(b));
        } else {
          unresolved.push([...tie]);
        }
        for (let k = i; k < j; k++) sub[k] = tie[k - i];
      }
      i = j;
    }

    ordered.push(...sub);
  }

  const standings = ordered.map((id, idx) => ({ ...byId.get(id)!, rank: idx + 1 }));
  return { standings, unresolved };
}

export type DerivedBracket = {
  r2: BuiltMatch[];
  final: BuiltMatch[];
  standings: BuiltStanding[] | null;
  status: "seeded" | "r1_done" | "r2_done" | "final";
};

/**
 * Recomputes R2, the final round-robin, standings, and the lifecycle status from the
 * current R1/R2/final state. Downstream matches whose pairing is unchanged keep their
 * recorded scores; matches whose participants changed are reset (cascade-clear).
 */
export function deriveBracket(
  r1: readonly BuiltMatch[],
  r2: readonly BuiltMatch[],
  final: readonly BuiltMatch[]
): DerivedBracket {
  const w1 = orderedWinners(r1, R1_MATCH_COUNT);
  if (!w1) return { r2: [], final: [], standings: null, status: "seeded" };

  const newR2 = buildR2(w1, r2);
  const w2 = orderedWinners(newR2, R2_MATCH_COUNT);
  if (!w2) return { r2: newR2, final: [], standings: null, status: "r1_done" };

  const newFinal = buildFinal(w2, final);
  const standings = computeStandings(w2, newFinal);
  const status = countRecorded(newFinal) > 0 ? "final" : "r2_done";
  return { r2: newR2, final: newFinal, standings, status };
}
