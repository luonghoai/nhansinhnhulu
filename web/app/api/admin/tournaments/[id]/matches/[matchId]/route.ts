import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Tournament } from "@/lib/models/Tournament";
import { toTournamentDTO } from "@/lib/dto";
import { recordMatchSchema } from "@/lib/validators";
import {
  type BuiltMatch,
  countRecorded,
  deriveBracket,
  isValidBo3,
  matchWinner,
} from "@/lib/tournament";

type Params = { params: Promise<{ id: string; matchId: string }> };

type Rounds = { r1: BuiltMatch[]; r2: BuiltMatch[]; final: BuiltMatch[] };

export async function PATCH(request: Request, { params }: Params) {
  const { id, matchId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = recordMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { scoreA, scoreB, confirmCascade } = parsed.data;
  if (!isValidBo3(scoreA, scoreB)) {
    return NextResponse.json(
      { error: "Tỉ số BO3 không hợp lệ (chỉ 2-0, 2-1, 0-2, 1-2)." },
      { status: 422 }
    );
  }

  await connectToDatabase();

  const tournament = await Tournament.findById(id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const rounds: Rounds = {
    r1: tournament.rounds.r1.map(toPlain),
    r2: tournament.rounds.r2.map(toPlain),
    final: tournament.rounds.final.map(toPlain),
  };

  const target =
    rounds.r1.find((m) => m.matchId === matchId) ??
    rounds.r2.find((m) => m.matchId === matchId) ??
    rounds.final.find((m) => m.matchId === matchId);

  if (!target) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (target.aId == null || target.bId == null) {
    return NextResponse.json(
      { error: "Trận chưa đủ 2 người chơi để ghi tỉ số." },
      { status: 422 }
    );
  }

  // Count downstream results before the edit (to detect cascade-clears).
  const recordedBefore = countRecorded(rounds.r2) + countRecorded(rounds.final);

  // Apply the score to the target match.
  target.scoreA = scoreA;
  target.scoreB = scoreB;
  target.winnerId = matchWinner(target);

  // Recompute downstream rounds (preserving unaffected results).
  const derived = deriveBracket(rounds.r1, rounds.r2, rounds.final);
  const recordedAfter = countRecorded(derived.r2) + countRecorded(derived.final);

  // Editing this result invalidates already-recorded downstream matches.
  if (recordedAfter < recordedBefore && !confirmCascade) {
    const cleared = recordedBefore - recordedAfter;
    return NextResponse.json(
      {
        error: "needs-confirm",
        message: `Sửa kết quả này sẽ xóa ${cleared} trận đã ghi ở vòng sau.`,
        cleared,
      },
      { status: 409 }
    );
  }

  const updated = await Tournament.findByIdAndUpdate(
    id,
    {
      $set: {
        "rounds.r1": rounds.r1,
        "rounds.r2": derived.r2,
        "rounds.final": derived.final,
        standings: derived.standings,
        status: derived.status,
        placements: {},
      },
    },
    { new: true }
  );
  if (!updated) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json({ tournament: toTournamentDTO(updated) });
}

function toPlain(m: {
  matchId: string;
  round: string;
  slot: number;
  aId?: string | null;
  bId?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  winnerId?: string | null;
}): BuiltMatch {
  return {
    matchId: m.matchId,
    round: m.round as BuiltMatch["round"],
    slot: m.slot,
    aId: m.aId ?? null,
    bId: m.bId ?? null,
    scoreA: m.scoreA ?? null,
    scoreB: m.scoreB ?? null,
    winnerId: m.winnerId ?? null,
  };
}

export const dynamic = "force-dynamic";
