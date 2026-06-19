import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { JoinRequest } from "@/lib/models/JoinRequest";
import { Raid } from "@/lib/models/Raid";
import { Dungeon } from "@/lib/models/Dungeon";
import { toJoinRequestDTO } from "@/lib/dto";
import { rejectRequestSchema } from "@/lib/validators";
import { notifyDecision } from "@/lib/discordClient";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = rejectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const joinRequest = await JoinRequest.findById(id);
  if (!joinRequest) {
    return NextResponse.json({ error: "Join request not found" }, { status: 404 });
  }
  if (joinRequest.status !== "pending") {
    return NextResponse.json({ error: "Join request already decided" }, { status: 409 });
  }

  joinRequest.status = "rejected";
  joinRequest.decidedBy = "admin";
  joinRequest.decidedAt = new Date();

  // DM the member directly via the Discord REST API. Never let a Discord failure
  // block the decision: set notifiedAt on success, but the rejection still succeeds
  // (and admin isn't stuck) if Discord errors (see .ai/planning/07-raid-announce.md).
  const raid = await Raid.findById(joinRequest.raidId).select("dungeonId startAt");
  const dungeon = raid ? await Dungeon.findById(raid.dungeonId).select("name") : null;
  try {
    await notifyDecision({
      discordId: joinRequest.discordId,
      decision: "rejected",
      dungeonName: dungeon?.name ?? "raid",
      startAt: (raid?.startAt ?? new Date()).toISOString(),
      reason: parsed.data.reason,
    });
    joinRequest.notifiedAt = new Date();
  } catch (err) {
    console.warn(`Failed to DM rejection to ${joinRequest.discordId}:`, err);
  }

  await joinRequest.save();

  return NextResponse.json({ request: toJoinRequestDTO(joinRequest) });
}

export const dynamic = "force-dynamic";
