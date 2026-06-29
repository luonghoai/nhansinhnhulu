import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";
import { createBattleSchema } from "@/lib/validators";

export async function GET(request: Request) {
  await connectToDatabase();

  const status = new URL(request.url).searchParams.get("status");
  const filter: Record<string, unknown> = status ? { status } : {};
  const events = await BattleEvent.find(filter).sort({ startAt: -1, createdAt: -1 });

  return NextResponse.json({ events: events.map(toBattleEventDTO) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createBattleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const event = await BattleEvent.create({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    startAt: new Date(parsed.data.startAt),
    format: parsed.data.format ?? "round_robin",
  });

  return NextResponse.json({ event: toBattleEventDTO(event) }, { status: 201 });
}

export const dynamic = "force-dynamic";
