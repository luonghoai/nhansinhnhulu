import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { toBattleEventDTO } from "@/lib/dto";
import { recordMatchupSchema } from "@/lib/validators";
import { computeGroupPoints, type BuiltMatchup, type BuiltTeam } from "@/lib/battle";

type Params = { params: Promise<{ id: string; matchupId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, matchupId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = recordMatchupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const event = await BattleEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Battle event not found" }, { status: 404 });
  }

  const matchup = event.groupMatchups.find((m) => m.matchupId === matchupId);
  if (!matchup) {
    return NextResponse.json({ error: "Matchup not found" }, { status: 404 });
  }

  matchup.result = parsed.data.result;

  // Recompute denormalised group points across every team.
  const teams = event.teams.map(
    (t): BuiltTeam => ({
      teamId: t.teamId,
      name: t.name,
      memberIds: t.memberIds.map((m) => m.toString()),
      groupPoints: t.groupPoints ?? 0,
    })
  );
  const matchups = event.groupMatchups.map(
    (m): BuiltMatchup => ({
      matchupId: m.matchupId,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      result: (m.result ?? null) as BuiltMatchup["result"],
    })
  );
  const points = computeGroupPoints(teams, matchups);
  for (const team of event.teams) {
    team.groupPoints = points[team.teamId] ?? 0;
  }

  // A recorded result moves the event into the group stage.
  if (event.status === "teams_generated") {
    event.status = "group_stage";
  }

  // Changing a result after finalists were picked can invalidate them.
  if (event.final) {
    const finalIds = event.final.teamIds.map((t) => t.toString());
    const minFinalistPts = Math.min(...finalIds.map((tid) => points[tid] ?? 0));
    const outranked = event.teams.some(
      (t) => !finalIds.includes(t.teamId) && (points[t.teamId] ?? 0) > minFinalistPts
    );
    if (outranked && !parsed.data.confirmReset) {
      return NextResponse.json(
        {
          error: "needs-confirm",
          message: "Kết quả mới làm thay đổi top 2 — cần chọn lại đội vào chung kết.",
        },
        { status: 409 }
      );
    }
    if (outranked) {
      event.final = null;
      event.championTeamId = null;
      event.status = "group_stage";
    }
  }

  await event.save();

  return NextResponse.json({ event: toBattleEventDTO(event) });
}

export const dynamic = "force-dynamic";
