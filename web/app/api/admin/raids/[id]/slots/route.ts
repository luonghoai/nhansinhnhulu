import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Raid } from "@/lib/models/Raid";
import { toRaidDTO } from "@/lib/dto";
import { updateRaidSlotsSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateRaidSlotsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const raid = await Raid.findById(id);
  if (!raid) {
    return NextResponse.json({ error: "Raid not found" }, { status: 404 });
  }

  if (parsed.data.slots.length !== raid.size) {
    return NextResponse.json(
      { error: `Expected ${raid.size} slots, got ${parsed.data.slots.length}` },
      { status: 400 }
    );
  }

  const memberIds = parsed.data.slots.map((slot) => slot.memberId).filter(Boolean);
  if (new Set(memberIds).size !== memberIds.length) {
    return NextResponse.json(
      { error: "A member can only occupy one slot in a raid" },
      { status: 400 }
    );
  }

  raid.slots = parsed.data.slots.map((slot) => ({
    index: slot.index,
    roleLabel: slot.roleLabel ?? null,
    memberId: slot.memberId ?? null,
  })) as typeof raid.slots;
  await raid.save();

  return NextResponse.json({ raid: toRaidDTO(raid) });
}

export const dynamic = "force-dynamic";
