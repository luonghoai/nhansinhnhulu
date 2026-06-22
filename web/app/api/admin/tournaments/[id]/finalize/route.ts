import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Tournament } from "@/lib/models/Tournament";
import { toTournamentDTO } from "@/lib/dto";
import { finalizeTournamentSchema } from "@/lib/validators";
import { FINAL_PLAYER_COUNT, rankFinalists } from "@/lib/tournament";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = finalizeTournamentSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const tournament = await Tournament.findById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const final = tournament.rounds.final;
  if (final.length === 0) {
    return NextResponse.json(
      { error: "Chưa có vòng chung kết để trao giải." },
      { status: 422 }
    );
  }
  if (final.some((m) => !m.winnerId)) {
    return NextResponse.json(
      { error: "Cần ghi đủ kết quả vòng chung kết trước khi trao giải." },
      { status: 422 }
    );
  }

  const finalists = [
    ...new Set(final.flatMap((m) => [m.aId, m.bId])),
  ].filter((x): x is string => Boolean(x));
  if (finalists.length !== FINAL_PLAYER_COUNT) {
    return NextResponse.json({ error: "Vòng chung kết không hợp lệ." }, { status: 422 });
  }

  const plainFinal = final.map((m) => ({
    matchId: m.matchId,
    round: m.round as "final",
    slot: m.slot,
    aId: m.aId ?? null,
    bId: m.bId ?? null,
    scoreA: m.scoreA ?? null,
    scoreB: m.scoreB ?? null,
    winnerId: m.winnerId ?? null,
  }));

  const { standings, unresolved } = rankFinalists(
    finalists,
    plainFinal,
    parsed.data.manualOrder
  );

  // Surface tied groups so the admin can pick the order manually.
  if (unresolved.length > 0) {
    return NextResponse.json(
      {
        error: "needs-manual",
        message: "Có người chơi hòa nhau không thể tự phân hạng. Hãy chọn thứ hạng thủ công.",
        unresolved,
      },
      { status: 409 }
    );
  }

  const byRank = new Map(standings.map((s) => [s.rank, s.entrantId]));
  const placements = {
    first: byRank.get(1) ?? null,
    second: byRank.get(2) ?? null,
    third: byRank.get(3) ?? null,
  };

  const updated = await Tournament.findByIdAndUpdate(
    id,
    { $set: { standings, placements, status: "completed" } },
    { new: true }
  );
  if (!updated) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json({ tournament: toTournamentDTO(updated) });
}

export const dynamic = "force-dynamic";
