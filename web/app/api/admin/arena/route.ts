import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { ArenaTeam } from "@/lib/models/ArenaTeam";
import { toArenaTeamDTO } from "@/lib/dto";
import { createArenaTeamSchema } from "@/lib/validators";
import { resolveArenaSlots } from "@/lib/arena";

export async function GET() {
  await connectToDatabase();
  const teams = await ArenaTeam.find().sort({ isActive: -1, sortOrder: 1, createdAt: 1 });
  return NextResponse.json({ teams: teams.map(toArenaTeamDTO) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createArenaTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const resolved = await resolveArenaSlots(parsed.data.slots ?? [], Member);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const count = await ArenaTeam.countDocuments({});

  const team = await ArenaTeam.create({
    name: parsed.data.name,
    tagline: parsed.data.tagline ?? null,
    rankLabel: parsed.data.rankLabel ?? null,
    notes: parsed.data.notes ?? null,
    slots: resolved.slots,
    sortOrder: count,
  });

  return NextResponse.json({ team: toArenaTeamDTO(team) }, { status: 201 });
}

export const dynamic = "force-dynamic";
