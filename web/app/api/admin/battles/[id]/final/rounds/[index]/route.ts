import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent, FINAL_ROUND_COUNT } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";
import { recordFinalRoundSchema } from "@/lib/validators";
import { computeRoundWins, decideChampion } from "@/lib/battle";

type Params = { params: Promise<{ id: string; index: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, index } = await params;
  const body = await request.json().catch(() => null);
  const parsed = recordFinalRoundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const roundIndex = Number(index);
  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= FINAL_ROUND_COUNT) {
    return NextResponse.json({ error: "Round index out of range" }, { status: 400 });
  }

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }
  if (!event.final) {
    return NextResponse.json({ error: "Chưa có vòng chung kết." }, { status: 422 });
  }

  const { winnerTeamId } = parsed.data;
  if (winnerTeamId && !event.final.teamIds.map((t) => t.toString()).includes(winnerTeamId)) {
    return NextResponse.json({ error: "Đội thắng không thuộc chung kết." }, { status: 422 });
  }

  const rounds = [...event.final.rounds];
  while (rounds.length < FINAL_ROUND_COUNT) rounds.push(null);
  rounds[roundIndex] = winnerTeamId;

  event.final.rounds = rounds;
  event.final.roundWins = computeRoundWins(rounds);

  const champion = decideChampion(rounds);
  event.championTeamId = champion;
  event.status = champion ? "completed" : "final_stage";

  await event.save();

  return NextResponse.json({ event: toBattleEventDTO(event) });
}

export const dynamic = "force-dynamic";
