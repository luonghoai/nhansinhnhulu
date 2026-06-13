import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Dungeon } from "@/lib/models/Dungeon";
import { toDungeonDTO } from "@/lib/dto";
import { createDungeonSchema } from "@/lib/validators";

export async function GET() {
  await connectToDatabase();
  const dungeons = await Dungeon.find().sort({ name: 1 });
  return NextResponse.json({ dungeons: dungeons.map(toDungeonDTO) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createDungeonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();
  const dungeon = await Dungeon.create(parsed.data);

  return NextResponse.json({ dungeon: toDungeonDTO(dungeon) }, { status: 201 });
}

export const dynamic = "force-dynamic";
