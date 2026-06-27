import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";
import { updateBattleSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  return NextResponse.json({ event: toBattleEventDTO(event) });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateBattleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const { startAt, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  if (startAt) update.startAt = new Date(startAt);

  const event = await BattleEvent.findByIdAndUpdate(id, update, { new: true });
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  return NextResponse.json({ event: toBattleEventDTO(event) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  await connectToDatabase();

  const event = await BattleEvent.findByIdAndDelete(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
