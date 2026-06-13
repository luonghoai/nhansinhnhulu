import { connectToDatabase } from "./db";
import { toDungeonDTO, toMemberDTO, toRaidDTO, type DungeonDTO, type MemberDTO, type RaidDTO } from "./dto";
import { Dungeon } from "./models/Dungeon";
import { Member } from "./models/Member";
import { Raid } from "./models/Raid";

const NEAREST_SIZES = [6, 12] as const;

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
