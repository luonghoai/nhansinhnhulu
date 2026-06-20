import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { ArenaTeam } from "@/lib/models/ArenaTeam";
import { toArenaTeamDTO } from "@/lib/dto";
import { updateArenaTeamSchema } from "@/lib/validators";
import { resolveArenaSlots } from "@/lib/arena";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateArenaTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const { slots: submittedSlots, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };

  if (submittedSlots) {
    const resolved = await resolveArenaSlots(submittedSlots, Member);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    update.slots = resolved.slots;
  }

  const team = await ArenaTeam.findByIdAndUpdate(id, update, { new: true });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ team: toArenaTeamDTO(team) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  await connectToDatabase();

  const team = await ArenaTeam.findByIdAndDelete(id);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
