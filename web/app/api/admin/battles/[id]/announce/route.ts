import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { Member } from "@/lib/models/Member";
import { announceBattle } from "@/lib/discordClient";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  // Resolve member discord ids for mentions.
  const memberIds = [
    ...new Set(event.teams.flatMap((t) => t.memberIds.map((m) => m.toString()))),
  ];
  const members = await Member.find({ _id: { $in: memberIds } }).select("_id discordId");
  const discordById = new Map(members.map((m) => [m._id.toString(), m.discordId]));

  const champion = event.championTeamId
    ? event.teams.find((t) => t.teamId === event.championTeamId)
    : null;

  try {
    const messageId = await announceBattle({
      battleId: event._id.toString(),
      title: event.title,
      description: event.description ?? null,
      startAt: event.startAt.toISOString(),
      status: event.status,
      teams: event.teams.map((t) => ({
        name: t.name,
        groupPoints: t.groupPoints ?? 0,
        discordIds: t.memberIds
          .map((m) => discordById.get(m.toString()))
          .filter((d): d is string => Boolean(d)),
      })),
      championName: champion?.name ?? null,
      existingMessageId: event.announceMessageId ?? null,
    });

    event.announceMessageId = messageId;
    await event.save();

    return NextResponse.json({ messageId });
  } catch (err) {
    console.error("Battle announce failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Announce failed" },
      { status: 502 }
    );
  }
}

export const dynamic = "force-dynamic";
