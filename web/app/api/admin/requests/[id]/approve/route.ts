import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { JoinRequest } from "@/lib/models/JoinRequest";
import { Raid } from "@/lib/models/Raid";
import { Dungeon } from "@/lib/models/Dungeon";
import { toJoinRequestDTO } from "@/lib/dto";
import { approveRequestSchema } from "@/lib/validators";
import { notifyDecision } from "@/lib/discordClient";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = approveRequestSchema.safeParse(body);
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

  const raid = await Raid.findById(joinRequest.raidId);
  if (!raid) {
    return NextResponse.json({ error: "Raid not found" }, { status: 404 });
  }

  const targetSlot =
    parsed.data.slotIndex !== undefined
      ? raid.slots.find((s) => s.index === parsed.data.slotIndex && !s.memberId)
      : raid.slots.find((s) => !s.memberId);

  if (!targetSlot) {
    return NextResponse.json({ error: "No free slot available in this raid" }, { status: 409 });
  }

  targetSlot.memberId = joinRequest.memberId;
  await raid.save();

  joinRequest.status = "approved";
  joinRequest.decidedBy = "admin";
  joinRequest.decidedAt = new Date();

  // DM the member directly via the Discord REST API. Never let a Discord failure
  // block the decision: set notifiedAt on success, but the action still succeeds
  // (and admin isn't stuck) if Discord errors (see .ai/planning/07-raid-announce.md).
  const dungeon = await Dungeon.findById(raid.dungeonId).select("name");
  try {
    await notifyDecision({
      discordId: joinRequest.discordId,
      decision: "approved",
      dungeonName: dungeon?.name ?? "raid",
      startAt: raid.startAt.toISOString(),
    });
    joinRequest.notifiedAt = new Date();
  } catch (err) {
    console.warn(`Failed to DM approval to ${joinRequest.discordId}:`, err);
  }

  await joinRequest.save();

  return NextResponse.json({ request: toJoinRequestDTO(joinRequest) });
}

export const dynamic = "force-dynamic";
