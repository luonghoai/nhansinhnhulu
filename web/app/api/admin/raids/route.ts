import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Dungeon } from "@/lib/models/Dungeon";
import { Raid } from "@/lib/models/Raid";
import { toRaidDTO } from "@/lib/dto";
import { createRaidSchema } from "@/lib/validators";

export async function GET() {
  await connectToDatabase();
  const raids = await Raid.find().sort({ startAt: 1 });
  return NextResponse.json({ raids: raids.map(toRaidDTO) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createRaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const dungeon = await Dungeon.findById(parsed.data.dungeonId);
  if (!dungeon) {
    return NextResponse.json({ error: "Dungeon not found" }, { status: 404 });
  }

  const slots = Array.from({ length: dungeon.size }, (_, index) => ({
    index,
    roleLabel: null,
    memberId: null,
  }));

  const raid = await Raid.create({
    dungeonId: dungeon._id,
    size: dungeon.size,
    startAt: new Date(parsed.data.startAt),
    title: parsed.data.title ?? null,
    notes: parsed.data.notes ?? null,
    slots,
  });

  return NextResponse.json({ raid: toRaidDTO(raid) }, { status: 201 });
}

export const dynamic = "force-dynamic";
