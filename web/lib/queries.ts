import { connectToDatabase } from "./db";
import {
  toArenaTeamDTO,
  toDungeonDTO,
  toMemberDTO,
  toRaidDTO,
  type ArenaTeamDTO,
  type DungeonDTO,
  type MemberDTO,
  type RaidDTO,
} from "./dto";
import { Dungeon } from "./models/Dungeon";
import { Member } from "./models/Member";
import { Raid } from "./models/Raid";
import { ArenaTeam } from "./models/ArenaTeam";
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

/** Active 3v3 arena squads with their rostered members resolved, for the public page. */
export async function getArenaTeams(): Promise<ArenaTeamWithMembers[]> {
  await connectToDatabase();

  const teams = await ArenaTeam.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });

  const memberIds = [
    ...new Set(
      teams.flatMap((team) =>
        team.slots.filter((s) => s.memberId).map((s) => s.memberId!.toString())
      )
    ),
  ];

  const members = await Member.find({ _id: { $in: memberIds } });
  const membersById: Record<string, MemberDTO> = {};
  for (const member of members) {
    membersById[member._id.toString()] = toMemberDTO(member);
  }

  return teams.map((team) => ({
    team: toArenaTeamDTO(team),
    members: Object.fromEntries(
      team.slots
        .filter((s) => s.memberId)
        .map((s) => [s.memberId!.toString(), membersById[s.memberId!.toString()]])
    ),
  }));
}
