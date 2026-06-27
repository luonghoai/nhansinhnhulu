import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";
import { generateTeamsSchema } from "@/lib/validators";
import { BATTLE_TEAM_SIZE } from "@/lib/models/BattleEvent";
import { buildGroupMatchups, generateTeams, isGeneratablePool } from "@/lib/battle";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = generateTeamsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  if (!isGeneratablePool(event.participants.length)) {
    return NextResponse.json(
      {
        error: `Cần số người chia hết cho ${BATTLE_TEAM_SIZE} (tối thiểu ${BATTLE_TEAM_SIZE * 2}).`,
      },
      { status: 422 }
    );
  }

  // Regenerating wipes all recorded stage data; require explicit confirmation.
  const hasResults =
    event.groupMatchups.some((m) => m.result !== null) || event.final !== null;
  if (hasResults && !parsed.data.confirmReset) {
    return NextResponse.json(
      { error: "needs-confirm", message: "Tạo lại đội sẽ xóa toàn bộ kết quả đã ghi." },
      { status: 409 }
    );
  }

  const teams = generateTeams(event.participants.map((p) => p.toString()));
  const groupMatchups = buildGroupMatchups(teams);

  const updated = await BattleEvent.findByIdAndUpdate(
    id,
    {
      $set: {
        teams,
        groupMatchups,
        final: null,
        championTeamId: null,
        status: "teams_generated",
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
