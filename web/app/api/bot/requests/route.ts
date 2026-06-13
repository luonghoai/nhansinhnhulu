import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { JoinRequest } from "@/lib/models/JoinRequest";
import { Member } from "@/lib/models/Member";
import { Raid } from "@/lib/models/Raid";
import { toJoinRequestDTO } from "@/lib/dto";
import { createJoinRequestSchema } from "@/lib/validators";
import { requireBotSecret } from "@/lib/botAuth";

export async function POST(request: Request) {
  const unauthorized = requireBotSecret(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = createJoinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const member = await Member.findOne({ discordId: parsed.data.discordId });
  if (!member) {
    return NextResponse.json({ error: "Member not synced" }, { status: 404 });
  }

  const raid = await Raid.findById(parsed.data.raidId);
  if (!raid) {
    return NextResponse.json({ error: "Raid not found" }, { status: 404 });
  }

  const alreadyRostered = raid.slots.some((slot) => slot.memberId?.equals(member._id));
  if (alreadyRostered) {
    return NextResponse.json({ error: "Already rostered in this raid" }, { status: 409 });
  }

  const hasFreeSlot = raid.slots.some((slot) => !slot.memberId);
  if (!hasFreeSlot) {
    return NextResponse.json({ error: "Raid is full" }, { status: 409 });
  }

  const existingPending = await JoinRequest.findOne({
    raidId: raid._id,
    memberId: member._id,
    status: "pending",
  });
  if (existingPending) {
    return NextResponse.json({ error: "Already requested to join this raid" }, { status: 409 });
  }

  const joinRequest = await JoinRequest.create({
    raidId: raid._id,
    memberId: member._id,
    discordId: member.discordId,
    requestedSlotIndex: parsed.data.requestedSlotIndex ?? null,
  });

  return NextResponse.json({ request: toJoinRequestDTO(joinRequest) }, { status: 201 });
}

export const dynamic = "force-dynamic";
