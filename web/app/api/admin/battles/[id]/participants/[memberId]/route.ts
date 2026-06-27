import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";

type Params = { params: Promise<{ id: string; memberId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id, memberId } = await params;

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  event.participants = event.participants.filter((p) => p.toString() !== memberId);
  await event.save();

  return NextResponse.json({ event: toBattleEventDTO(event) });
}

export const dynamic = "force-dynamic";
