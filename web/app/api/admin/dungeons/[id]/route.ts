import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Dungeon } from "@/lib/models/Dungeon";
import { Raid } from "@/lib/models/Raid";
import { toDungeonDTO } from "@/lib/dto";
import { updateDungeonSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateDungeonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const dungeon = await Dungeon.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!dungeon) {
    return NextResponse.json({ error: "Dungeon not found" }, { status: 404 });
  }

  return NextResponse.json({ dungeon: toDungeonDTO(dungeon) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  await connectToDatabase();

  const referencingRaid = await Raid.findOne({ dungeonId: id });
  if (referencingRaid) {
    return NextResponse.json(
      { error: "Cannot delete a dungeon referenced by raids" },
      { status: 409 }
    );
  }

  const dungeon = await Dungeon.findByIdAndDelete(id);
  if (!dungeon) {
    return NextResponse.json({ error: "Dungeon not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
