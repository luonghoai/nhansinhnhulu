import type { HydratedDocument } from "mongoose";
import type { MemberDoc } from "./models/Member";
import type { DungeonDoc } from "./models/Dungeon";
import type { RaidDoc, SlotDoc } from "./models/Raid";
import type { JoinRequestDoc } from "./models/JoinRequest";
import type {
  BattleEventDoc,
  BattleTeamDoc,
  MatchupDoc,
  FinalDoc,
  BracketDoc,
  BracketMatchDoc,
} from "./models/BattleEvent";
import type {
  TournamentDoc,
  EntrantDoc,
  MatchDoc,
  StandingDoc,
} from "./models/Tournament";

// Shapes mirror the DTOs in `.ai/planning/06-api-contract.md`.

export type MemberDTO = {
  id: string;
  discordId: string;
  discordName: string;
  discordAvatar: string;
  class: string | null;
  classIcon: string | null;
  isActive: boolean;
  syncedAt: string;
};

export type DungeonDTO = {
  id: string;
  name: string;
  size: 6 | 12;
  description?: string;
  imageKey?: string | null;
  isActive: boolean;
};

export type SlotDTO = {
  index: number;
  roleLabel: string | null;
  memberId: string | null;
};

export type RaidDTO = {
  id: string;
  dungeonId: string;
  size: 6 | 12;
  startAt: string;
  title?: string | null;
  notes?: string | null;
  slots: SlotDTO[];
  status: "scheduled" | "completed" | "cancelled";
  announcedAt?: string | null;
};

export type JoinRequestDTO = {
  id: string;
  raidId: string;
  memberId: string;
  discordId: string;
  status: "pending" | "approved" | "rejected";
  requestedSlotIndex?: number | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  notifiedAt?: string | null;
};

export function toMemberDTO(doc: HydratedDocument<MemberDoc>): MemberDTO {
  return {
    id: doc._id.toString(),
    discordId: doc.discordId,
    discordName: doc.discordName,
    discordAvatar: doc.discordAvatar,
    class: doc.class ?? null,
    classIcon: doc.classIcon ?? null,
    isActive: doc.isActive ?? true,
    syncedAt: (doc.syncedAt ?? new Date()).toISOString(),
  };
}

export function toDungeonDTO(doc: HydratedDocument<DungeonDoc>): DungeonDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    size: doc.size as 6 | 12,
    description: doc.description ?? "",
    imageKey: doc.imageKey ?? null,
    isActive: doc.isActive ?? true,
  };
}

function toSlotDTO(slot: SlotDoc): SlotDTO {
  return {
    index: slot.index,
    roleLabel: slot.roleLabel ?? null,
    memberId: slot.memberId ? slot.memberId.toString() : null,
  };
}

export function toRaidDTO(doc: HydratedDocument<RaidDoc>): RaidDTO {
  return {
    id: doc._id.toString(),
    dungeonId: doc.dungeonId.toString(),
    size: doc.size as 6 | 12,
    startAt: doc.startAt.toISOString(),
    title: doc.title ?? null,
    notes: doc.notes ?? null,
    slots: (doc.slots ?? []).map(toSlotDTO),
    status: doc.status as RaidDTO["status"],
    announcedAt: doc.announcedAt ? doc.announcedAt.toISOString() : null,
  };
}

export type RaidWithDungeonDTO = RaidDTO & { dungeon: DungeonDTO };

/** View-model for the public 3v3 card; populated from battle-event teams (see queries.ts). */
export type ArenaSlotDTO = {
  index: number;
  roleLabel: string | null;
  memberId: string | null;
};

export type ArenaTeamDTO = {
  id: string;
  name: string;
  tagline: string | null;
  rankLabel: string | null;
  wins: number;
  losses: number;
  slots: ArenaSlotDTO[];
  notes: string | null;
  isActive: boolean;
};

// ---- 3v3 Battle events — see .ai/planning/10-3vs3-battle-feature.md ----

export type BattleTeamDTO = {
  teamId: string;
  name: string;
  memberIds: string[];
  groupPoints: number;
};

export type MatchupDTO = {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  result: "a_win" | "draw" | "b_win" | null;
};

export type FinalDTO = {
  teamIds: string[];
  rounds: (string | null)[];
  roundWins: Record<string, number>;
};

export type MatchSourceDTO =
  | { kind: "seed"; teamId: string }
  | { kind: "winner"; matchId: string }
  | { kind: "loser"; matchId: string };

export type BracketMatchDTO = {
  matchId: string;
  bracket: "WB" | "LB" | "GF";
  label: string;
  order: number;
  round: number;
  slot: number;
  bestOf: number;
  aSource: MatchSourceDTO;
  bSource: MatchSourceDTO;
  aTeamId: string | null;
  bTeamId: string | null;
  rounds: (string | null)[];
  winnerTeamId: string | null;
};

export type BracketDTO = {
  matches: BracketMatchDTO[];
};

export type BattleEventDTO = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  format: "round_robin" | "double_elim";
  status:
    | "draft"
    | "open"
    | "teams_generated"
    | "group_stage"
    | "final_stage"
    | "bracket_stage"
    | "completed";
  participants: string[];
  teams: BattleTeamDTO[];
  groupMatchups: MatchupDTO[];
  final: FinalDTO | null;
  bracket: BracketDTO | null;
  championTeamId: string | null;
  announceMessageId: string | null;
};

function toBattleTeamDTO(team: BattleTeamDoc): BattleTeamDTO {
  return {
    teamId: team.teamId,
    name: team.name,
    memberIds: (team.memberIds ?? []).map((id) => id.toString()),
    groupPoints: team.groupPoints ?? 0,
  };
}

function toMatchupDTO(m: MatchupDoc): MatchupDTO {
  return {
    matchupId: m.matchupId,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    result: (m.result ?? null) as MatchupDTO["result"],
  };
}

function toFinalDTO(final: FinalDoc): FinalDTO {
  const roundWins =
    final.roundWins && typeof final.roundWins === "object"
      ? (final.roundWins as Record<string, number>)
      : {};
  return {
    teamIds: (final.teamIds ?? []).map((id) => id.toString()),
    rounds: (final.rounds ?? []).map((r) => r ?? null),
    roundWins: { ...roundWins },
  };
}

function toBracketMatchDTO(m: BracketMatchDoc): BracketMatchDTO {
  return {
    matchId: m.matchId,
    bracket: m.bracket as BracketMatchDTO["bracket"],
    label: m.label,
    order: m.order,
    round: m.round ?? 0,
    slot: m.slot ?? 0,
    bestOf: m.bestOf,
    aSource: m.aSource as MatchSourceDTO,
    bSource: m.bSource as MatchSourceDTO,
    aTeamId: m.aTeamId ?? null,
    bTeamId: m.bTeamId ?? null,
    rounds: (m.rounds ?? []).map((r) => (r as string | null) ?? null),
    winnerTeamId: m.winnerTeamId ?? null,
  };
}

function toBracketDTO(bracket: BracketDoc): BracketDTO {
  return {
    matches: (bracket.matches ?? []).map(toBracketMatchDTO),
  };
}

export function toBattleEventDTO(doc: HydratedDocument<BattleEventDoc>): BattleEventDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    startAt: doc.startAt.toISOString(),
    format: (doc.format ?? "round_robin") as BattleEventDTO["format"],
    status: doc.status as BattleEventDTO["status"],
    participants: (doc.participants ?? []).map((id) => id.toString()),
    teams: (doc.teams ?? []).map(toBattleTeamDTO),
    groupMatchups: (doc.groupMatchups ?? []).map(toMatchupDTO),
    final: doc.final ? toFinalDTO(doc.final) : null,
    bracket: doc.bracket ? toBracketDTO(doc.bracket) : null,
    championTeamId: doc.championTeamId ?? null,
    announceMessageId: doc.announceMessageId ?? null,
  };
}

// ---- Tournaments (Cờ 5 Quân) — see .ai/planning/09-co-5-quan-feature.md ----

export type EntrantDTO = {
  entrantId: string;
  name: string;
  memberId: string | null;
  seed: number;
};

export type MatchDTO = {
  matchId: string;
  round: "r1" | "r2" | "final";
  slot: number;
  aId: string | null;
  bId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
};

export type StandingDTO = {
  entrantId: string;
  points: number;
  gameWins: number;
  rank: number | null;
};

export type TournamentDTO = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  gameType: string;
  status: "draft" | "seeded" | "r1_done" | "r2_done" | "final" | "completed";
  entrants: EntrantDTO[];
  rounds: { r1: MatchDTO[]; r2: MatchDTO[]; final: MatchDTO[] };
  standings: StandingDTO[] | null;
  placements: { first: string | null; second: string | null; third: string | null };
  announceMessageId: string | null;
};

function toEntrantDTO(e: EntrantDoc): EntrantDTO {
  return {
    entrantId: e.entrantId,
    name: e.name,
    memberId: e.memberId ? e.memberId.toString() : null,
    seed: e.seed ?? 0,
  };
}

function toMatchDTO(m: MatchDoc): MatchDTO {
  return {
    matchId: m.matchId,
    round: m.round as MatchDTO["round"],
    slot: m.slot,
    aId: m.aId ?? null,
    bId: m.bId ?? null,
    scoreA: m.scoreA ?? null,
    scoreB: m.scoreB ?? null,
    winnerId: m.winnerId ?? null,
  };
}

function toStandingDTO(s: StandingDoc): StandingDTO {
  return {
    entrantId: s.entrantId,
    points: s.points ?? 0,
    gameWins: s.gameWins ?? 0,
    rank: s.rank ?? null,
  };
}

export function toTournamentDTO(doc: HydratedDocument<TournamentDoc>): TournamentDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    startAt: doc.startAt.toISOString(),
    gameType: doc.gameType ?? "co5quan",
    status: doc.status as TournamentDTO["status"],
    entrants: (doc.entrants ?? []).map(toEntrantDTO),
    rounds: {
      r1: (doc.rounds?.r1 ?? []).map(toMatchDTO),
      r2: (doc.rounds?.r2 ?? []).map(toMatchDTO),
      final: (doc.rounds?.final ?? []).map(toMatchDTO),
    },
    standings: doc.standings ? doc.standings.map(toStandingDTO) : null,
    placements: {
      first: doc.placements?.first ?? null,
      second: doc.placements?.second ?? null,
      third: doc.placements?.third ?? null,
    },
    announceMessageId: doc.announceMessageId ?? null,
  };
}

export function toJoinRequestDTO(doc: HydratedDocument<JoinRequestDoc>): JoinRequestDTO {
  return {
    id: doc._id.toString(),
    raidId: doc.raidId.toString(),
    memberId: doc.memberId.toString(),
    discordId: doc.discordId,
    status: doc.status as JoinRequestDTO["status"],
    requestedSlotIndex: doc.requestedSlotIndex ?? null,
    decidedBy: doc.decidedBy ?? null,
    decidedAt: doc.decidedAt ? doc.decidedAt.toISOString() : null,
    notifiedAt: doc.notifiedAt ? doc.notifiedAt.toISOString() : null,
  };
}
