import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";
import { recordBracketGameSchema } from "@/lib/validators";
import { deriveBracket, type BracketMatch, type MatchSource } from "@/lib/battle";

type Params = { params: Promise<{ id: string; matchId: string; index: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, matchId, index } = await params;
  const body = await request.json().catch(() => null);
  const parsed = recordBracketGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }
  if (!event.bracket || (event.bracket.matches ?? []).length === 0) {
    return NextResponse.json({ error: "Chưa có nhánh đấu." }, { status: 422 });
  }

  const target = event.bracket.matches.find((m) => m.matchId === matchId);
  if (!target) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const gameIndex = Number(index);
  if (!Number.isInteger(gameIndex) || gameIndex < 0 || gameIndex >= target.bestOf) {
    return NextResponse.json({ error: "Game index out of range" }, { status: 400 });
  }

  const { winnerTeamId } = parsed.data;
  if (
    winnerTeamId &&
    winnerTeamId !== (target.aTeamId ?? null) &&
    winnerTeamId !== (target.bTeamId ?? null)
  ) {
    return NextResponse.json({ error: "Đội thắng không thuộc trận này." }, { status: 422 });
  }

  // Apply the recorded game-winner, then recompute the whole bracket so downstream
  // matches (and the champion) follow — clearing any match whose participants change.
  const matches: BracketMatch[] = event.bracket.matches.map((m) => ({
    matchId: m.matchId,
    bracket: m.bracket as BracketMatch["bracket"],
    label: m.label,
    order: m.order,
    round: m.round ?? 0,
    slot: m.slot ?? 0,
    bestOf: m.bestOf,
    aSource: m.aSource as MatchSource,
    bSource: m.bSource as MatchSource,
    aTeamId: m.aTeamId ?? null,
    bTeamId: m.bTeamId ?? null,
    rounds: (m.rounds ?? []).map((r) => (r as string | null) ?? null),
    winnerTeamId: m.winnerTeamId ?? null,
  }));

  const edited = matches.find((m) => m.matchId === matchId)!;
  const rounds = [...edited.rounds];
  while (rounds.length < edited.bestOf) rounds.push(null);
  rounds[gameIndex] = winnerTeamId;
  edited.rounds = rounds;

  const derived = deriveBracket(matches);

  const updated = await BattleEvent.findByIdAndUpdate(
    id,
    {
      $set: {
        "bracket.matches": derived.matches,
        championTeamId: derived.championTeamId,
        status: derived.status,
      },
    },
    { new: true }
  );
  if (!updated) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  return NextResponse.json({ event: toBattleEventDTO(updated) });
}

export const dynamic = "force-dynamic";
