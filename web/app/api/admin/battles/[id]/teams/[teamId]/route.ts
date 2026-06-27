import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";
import { renameBattleTeamSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string; teamId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, teamId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = renameBattleTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  const team = event.teams.find((t) => t.teamId === teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  team.name = parsed.data.name;
  await event.save();

  return NextResponse.json({ event: toBattleEventDTO(event) });
}

export const dynamic = "force-dynamic";
