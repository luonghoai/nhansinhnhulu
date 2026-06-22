import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Tournament, type TournamentDoc } from "@/lib/models/Tournament";
import { toTournamentDTO } from "@/lib/dto";
import { createTournamentSchema } from "@/lib/validators";

export async function GET(request: Request) {
  await connectToDatabase();
  const status = new URL(request.url).searchParams.get("status");
  const tournaments = status
    ? await Tournament.find({ status: status as TournamentDoc["status"] }).sort({ startAt: 1 })
    : await Tournament.find().sort({ startAt: 1 });
  return NextResponse.json({ tournaments: tournaments.map(toTournamentDTO) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const tournament = await Tournament.create({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    startAt: new Date(parsed.data.startAt),
  });

  return NextResponse.json({ tournament: toTournamentDTO(tournament) }, { status: 201 });
}

export const dynamic = "force-dynamic";
