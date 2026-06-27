import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";
import { advanceFinalSchema } from "@/lib/validators";
import {
  buildFinal,
  isGroupComplete,
  type BuiltMatchup,
} from "@/lib/battle";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = advanceFinalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  const matchups = event.groupMatchups.map(
    (m): BuiltMatchup => ({
      matchupId: m.matchupId,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      result: (m.result ?? null) as BuiltMatchup["result"],
    })
  );
  if (!isGroupComplete(matchups)) {
    return NextResponse.json(
      { error: "Cần ghi đủ kết quả vòng bảng trước khi vào chung kết." },
      { status: 422 }
    );
  }

  const [aId, bId] = parsed.data.teamIds;
  if (aId === bId) {
    return NextResponse.json({ error: "Hai đội chung kết phải khác nhau." }, { status: 422 });
  }
  const teamIds = new Set(event.teams.map((t) => t.teamId));
  if (!teamIds.has(aId) || !teamIds.has(bId)) {
    return NextResponse.json({ error: "Đội không hợp lệ." }, { status: 422 });
  }

  event.final = buildFinal([aId, bId]);
  event.championTeamId = null;
  event.status = "final_stage";
  await event.save();

  return NextResponse.json({ event: toBattleEventDTO(event) });
}

export const dynamic = "force-dynamic";
