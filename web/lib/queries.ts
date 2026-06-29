import { connectToDatabase } from "./db";
import {
  toDungeonDTO,
  toMemberDTO,
  toRaidDTO,
  toTournamentDTO,
  type ArenaTeamDTO,
  type DungeonDTO,
  type MemberDTO,
  type RaidDTO,
  type TournamentDTO,
} from "./dto";
import { Dungeon } from "./models/Dungeon";
import { Member } from "./models/Member";
import { Raid } from "./models/Raid";
import { BattleEvent } from "./models/BattleEvent";
import { Tournament } from "./models/Tournament";
import { getWeekRangeUtc } from "./time";

const NEAREST_SIZES = [6, 12] as const;

export type TeamStats = {
  /** Active members in the directory. */
  memberCount: number;
  /** Raids marked completed (dungeons conquered). */
  dungeonsConquered: number;
  /** Raids scheduled within the current team-timezone week. */
  raidsThisWeek: number;
};

/** Aggregate counts for the landing "Về chúng tôi" stat cards. */
export async function getTeamStats(): Promise<TeamStats> {
  await connectToDatabase();

  const { start, end } = getWeekRangeUtc();

  const [memberCount, dungeonsConquered, raidsThisWeek] = await Promise.all([
    Member.countDocuments({ isActive: true }),
    Raid.countDocuments({ status: "completed" }),
    Raid.countDocuments({ startAt: { $gte: start, $lte: end } }),
  ]);

  return { memberCount, dungeonsConquered, raidsThisWeek };
}

export type NearestRaid = {
  raid: RaidDTO;
  dungeon: DungeonDTO;
  members: Record<string, MemberDTO>;
};

/** Nearest scheduled raid for each size (6p + 12p), per locked product decision. */
export async function getNearestRaids(): Promise<NearestRaid[]> {
  await connectToDatabase();

  const now = new Date();

  const nearestRaids = await Promise.all(
    NEAREST_SIZES.map((size) =>
      Raid.findOne({ status: "scheduled", size, startAt: { $gte: now } }).sort({ startAt: 1 })
    )
  );

  const raids = nearestRaids.filter((raid): raid is NonNullable<typeof raid> => raid !== null);

  const dungeonIds = [...new Set(raids.map((raid) => raid.dungeonId.toString()))];
  const memberIds = [
    ...new Set(
      raids.flatMap((raid) =>
        raid.slots.filter((s) => s.memberId).map((s) => s.memberId!.toString())
      )
    ),
  ];

  const [dungeons, members] = await Promise.all([
    Dungeon.find({ _id: { $in: dungeonIds } }),
    Member.find({ _id: { $in: memberIds } }),
  ]);

  const dungeonById = new Map(dungeons.map((d) => [d._id.toString(), toDungeonDTO(d)]));
  const membersById: Record<string, MemberDTO> = {};
  for (const member of members) {
    membersById[member._id.toString()] = toMemberDTO(member);
  }

  return raids.map((raid) => ({
    raid: toRaidDTO(raid),
    dungeon: dungeonById.get(raid.dungeonId.toString())!,
    members: Object.fromEntries(
      raid.slots
        .filter((s) => s.memberId)
        .map((s) => [s.memberId!.toString(), membersById[s.memberId!.toString()]])
    ),
  }));
}

export type ArenaTeamWithMembers = {
  team: ArenaTeamDTO;
  members: Record<string, MemberDTO>;
};

/**
 * Teams of the most recent 3v3 battle event that has teams generated, mapped to the
 * arena card view-model for the public page. Group wins/losses are derived from the
 * recorded group matchups; the champion (if any) gets the honour seal.
 */
export async function getArenaTeams(): Promise<ArenaTeamWithMembers[]> {
  await connectToDatabase();

  const event = await BattleEvent.findOne({ "teams.0": { $exists: true } }).sort({
    startAt: -1,
    createdAt: -1,
  });
  if (!event) return [];

  const memberIds = [
    ...new Set(event.teams.flatMap((team) => team.memberIds.map((m) => m.toString()))),
  ];

  const members = await Member.find({ _id: { $in: memberIds } });
  const membersById: Record<string, MemberDTO> = {};
  for (const member of members) {
    membersById[member._id.toString()] = toMemberDTO(member);
  }

  return event.teams.map((team) => {
    let wins = 0;
    let losses = 0;
    if (event.format === "double_elim") {
      // Series-level record across decided bracket matches the team played.
      for (const m of event.bracket?.matches ?? []) {
        if (!m.winnerTeamId) continue;
        if (m.aTeamId === team.teamId || m.bTeamId === team.teamId) {
          if (m.winnerTeamId === team.teamId) wins++;
          else losses++;
        }
      }
    } else {
      for (const m of event.groupMatchups) {
        if (m.result == null) continue;
        if (m.teamAId === team.teamId) {
          if (m.result === "a_win") wins++;
          else if (m.result === "b_win") losses++;
        } else if (m.teamBId === team.teamId) {
          if (m.result === "b_win") wins++;
          else if (m.result === "a_win") losses++;
        }
      }
    }

    const teamMemberIds = team.memberIds.map((m) => m.toString());
    const arenaTeam: ArenaTeamDTO = {
      id: team.teamId,
      name: team.name,
      tagline: null,
      rankLabel: event.championTeamId === team.teamId ? "Vô địch" : null,
      wins,
      losses,
      slots: teamMemberIds.map((memberId, index) => ({
        index,
        roleLabel: null,
        memberId,
      })),
      notes: null,
      isActive: true,
    };

    return {
      team: arenaTeam,
      members: Object.fromEntries(
        teamMemberIds
          .filter((id) => membersById[id])
          .map((id) => [id, membersById[id]])
      ),
    };
  });
}

export type FeaturedTournament = {
  tournament: TournamentDTO;
  members: Record<string, MemberDTO>;
};

/** Most recent non-draft tournament (seeded → completed), with linked members resolved. */
export async function getFeaturedTournament(): Promise<FeaturedTournament | null> {
  await connectToDatabase();

  const doc = await Tournament.findOne({ status: { $ne: "draft" } }).sort({ startAt: -1 });
  if (!doc) return null;

  const tournament = toTournamentDTO(doc);

  const memberIds = tournament.entrants
    .map((e) => e.memberId)
    .filter((m): m is string => Boolean(m));

  const members = await Member.find({ _id: { $in: memberIds } });
  const membersById: Record<string, MemberDTO> = {};
  for (const member of members) {
    membersById[member._id.toString()] = toMemberDTO(member);
  }

  return { tournament, members: membersById };
}
