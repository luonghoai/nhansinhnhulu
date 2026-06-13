import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { JoinRequest } from "@/lib/models/JoinRequest";
import { Raid } from "@/lib/models/Raid";
import { toJoinRequestDTO } from "@/lib/dto";
import { approveRequestSchema } from "@/lib/validators";
import { notifyBot } from "@/lib/botClient";

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

  const notified = await notifyBot({
    discordId: joinRequest.discordId,
    decision: "approved",
    raidId: raid._id.toString(),
  });
  if (notified) {
    joinRequest.notifiedAt = new Date();
  }

  await joinRequest.save();

  return NextResponse.json({ request: toJoinRequestDTO(joinRequest) });
}

export const dynamic = "force-dynamic";
