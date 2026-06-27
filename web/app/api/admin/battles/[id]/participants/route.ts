import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { Member } from "@/lib/models/Member";
import { toBattleEventDTO } from "@/lib/dto";
import { addParticipantSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = addParticipantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const member = await Member.findById(parsed.data.memberId);
  if (!member || member.isActive === false) {
    return NextResponse.json({ error: "Member not found or inactive" }, { status: 404 });
  }

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  const already = event.participants.some((p) => p.equals(member._id));
  if (!already) {
    event.participants.push(member._id);
    if (event.status === "draft") event.status = "open";
    await event.save();
  }

  return NextResponse.json({ event: toBattleEventDTO(event) });
}

export const dynamic = "force-dynamic";
