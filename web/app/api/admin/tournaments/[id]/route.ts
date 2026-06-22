import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Tournament } from "@/lib/models/Tournament";
import { toTournamentDTO } from "@/lib/dto";
import { updateTournamentSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  await connectToDatabase();
  const tournament = await Tournament.findById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json({ tournament: toTournamentDTO(tournament) });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startAt) {
    update.startAt = new Date(parsed.data.startAt);
  }

  const tournament = await Tournament.findByIdAndUpdate(id, update, { new: true });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json({ tournament: toTournamentDTO(tournament) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await connectToDatabase();
  const tournament = await Tournament.findByIdAndDelete(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
