import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Dungeon } from "@/lib/models/Dungeon";
import { Raid } from "@/lib/models/Raid";
import { toDungeonDTO, toRaidDTO, type RaidWithDungeonDTO } from "@/lib/dto";
import { getWeekRangeUtc } from "@/lib/time";
import { requireBotSecret } from "@/lib/botAuth";

export async function GET(request: Request) {
  const unauthorized = requireBotSecret(request);
  if (unauthorized) return unauthorized;

  await connectToDatabase();

  const now = new Date();
  const { end } = getWeekRangeUtc(now);

  const raids = await Raid.find({
    status: "scheduled",
    startAt: { $gte: now, $lte: end },
  }).sort({ startAt: 1 });

  const dungeons = await Dungeon.find({
    _id: { $in: raids.map((r) => r.dungeonId) },
  });
  const dungeonById = new Map(dungeons.map((d) => [d._id.toString(), toDungeonDTO(d)]));

  const result: RaidWithDungeonDTO[] = raids.map((raid) => ({
    ...toRaidDTO(raid),
    dungeon: dungeonById.get(raid.dungeonId.toString())!,
  }));

  return NextResponse.json({ raids: result });
}

export const dynamic = "force-dynamic";
