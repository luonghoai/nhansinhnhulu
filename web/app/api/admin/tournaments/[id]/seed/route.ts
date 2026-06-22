import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Tournament } from "@/lib/models/Tournament";
import { toTournamentDTO } from "@/lib/dto";
import { seedTournamentSchema } from "@/lib/validators";
import { ENTRANT_COUNT, seedTournament } from "@/lib/tournament";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = seedTournamentSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const tournament = await Tournament.findById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.entrants.length !== ENTRANT_COUNT) {
    return NextResponse.json(
      { error: `Cần đúng ${ENTRANT_COUNT} người chơi trước khi bốc thăm.` },
      { status: 422 }
    );
  }

  // Re-seeding wipes all recorded results; require explicit confirmation.
  const alreadySeeded = tournament.status !== "draft";
  if (alreadySeeded && !parsed.data.confirmReset) {
    return NextResponse.json(
      { error: "needs-confirm", message: "Bốc thăm lại sẽ xóa toàn bộ kết quả đã ghi." },
      { status: 409 }
    );
  }

  const { entrants, r1 } = seedTournament(
    tournament.entrants.map((e) => ({
      name: e.name,
      memberId: e.memberId ? e.memberId.toString() : null,
    }))
  );

  const updated = await Tournament.findByIdAndUpdate(
    id,
    {
      $set: {
        entrants,
        rounds: { r1, r2: [], final: [] },
        standings: null,
        placements: {},
        status: "seeded",
      },
    },
    { new: true }
  );
  if (!updated) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json({ tournament: toTournamentDTO(updated) });
}

export const dynamic = "force-dynamic";
