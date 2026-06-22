import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { Tournament } from "@/lib/models/Tournament";
import { toTournamentDTO } from "@/lib/dto";
import { putEntrantsSchema } from "@/lib/validators";
import { newId } from "@/lib/tournament";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = putEntrantsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Cần đúng 20 tên người chơi (không để trống)." },
      { status: 422 }
    );
  }

  await connectToDatabase();

  const tournament = await Tournament.findById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Entrants are locked once the bracket is seeded; re-seed to change them.
  if (tournament.status !== "draft") {
    return NextResponse.json(
      { error: "Giải đã bốc thăm — hãy bốc thăm lại để đổi người chơi." },
      { status: 409 }
    );
  }

  // Validate any linked members exist.
  const memberIds = parsed.data.entrants
    .map((e) => e.memberId)
    .filter((m): m is string => Boolean(m));
  if (memberIds.length > 0) {
    const found = await Member.find({ _id: { $in: memberIds } }).select("_id");
    const foundSet = new Set(found.map((m) => m._id.toString()));
    if (memberIds.some((m) => !foundSet.has(m))) {
      return NextResponse.json({ error: "One or more members not found" }, { status: 400 });
    }
  }

  // Replace the full list; seeds are assigned later at seed time.
  const entrants = parsed.data.entrants.map((e) => ({
    entrantId: newId(),
    name: e.name,
    memberId: e.memberId ?? null,
    seed: 0,
  }));

  const updated = await Tournament.findByIdAndUpdate(
    id,
    { $set: { entrants } },
    { new: true }
  );
  if (!updated) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json({ tournament: toTournamentDTO(updated) });
}

export const dynamic = "force-dynamic";
