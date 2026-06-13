import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Raid } from "@/lib/models/Raid";
import { toRaidDTO } from "@/lib/dto";
import { updateRaidSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateRaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startAt) {
    update.startAt = new Date(parsed.data.startAt);
  }

  const raid = await Raid.findByIdAndUpdate(id, update, { new: true });
  if (!raid) {
    return NextResponse.json({ error: "Raid not found" }, { status: 404 });
  }

  return NextResponse.json({ raid: toRaidDTO(raid) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  await connectToDatabase();

  const raid = await Raid.findByIdAndDelete(id);
  if (!raid) {
    return NextResponse.json({ error: "Raid not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
