import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { Member } from "@/lib/models/Member";
import { toBattleEventDTO } from "@/lib/dto";
import { generateTeamsSchema } from "@/lib/validators";
import { BATTLE_TEAM_SIZE } from "@/lib/models/BattleEvent";
import { isTovanIcon, rangeForClassIcon } from "@/lib/classes";
import {
  buildDoubleElimBracket,
  buildGroupMatchups,
  deriveBracket,
  generateBalancedTeams,
  isGeneratablePool,
  isPowerOfTwoTeamCount,
  tovanCount,
  type PoolMember,
} from "@/lib/battle";

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

  // Build a class-tagged pool (Tố Vấn ↔ classIcon "ToVan", plus long/short range).
  // Members missing / soft-deleted between pool edit and generate read as non-Tố Vấn
  // with an unknown ("flex") range.
  const memberDocs = await Member.find({ _id: { $in: event.participants } }).select(
    "_id classIcon"
  );
  const classByMember = new Map<string, string | null | undefined>(
    memberDocs.map((m) => [m._id.toString(), m.classIcon])
  );
  const pool: PoolMember[] = event.participants.map((p) => {
    const memberId = p.toString();
    const classIcon = classByMember.get(memberId);
    return {
      memberId,
      isTovan: isTovanIcon(classIcon),
      range: rangeForClassIcon(classIcon),
    };
  });

  // Exactly one Tố Vấn per team: require exactly `teamCount` Tố Vấn in the pool.
  const teamCount = pool.length / BATTLE_TEAM_SIZE;
  const tovan = tovanCount(pool);
  if (tovan !== teamCount) {
    return NextResponse.json(
      {
        error: tovan < teamCount ? "not-enough-tovan" : "too-many-tovan",
        message: `Cần đúng ${teamCount} Tố Vấn cho ${teamCount} đội (hiện có ${tovan}).`,
      },
      { status: 422 }
    );
  }

  // Double-elim needs a power-of-two team count (4 / 8 / 16 → 12 / 24 / 48 người).
  const isDoubleElim = event.format === "double_elim";
  if (isDoubleElim && !isPowerOfTwoTeamCount(teamCount)) {
    return NextResponse.json(
      {
        error: "invalid-bracket-size",
        message: `Nhánh loại trực tiếp cần 4/8/16 đội (hiện có ${teamCount}).`,
      },
      { status: 422 }
    );
  }

  // Regenerating wipes all recorded stage data; require explicit confirmation.
  const hasResults =
    event.groupMatchups.some((m) => m.result !== null) ||
    event.final !== null ||
    (event.bracket?.matches ?? []).some((m) => (m.rounds ?? []).some((r) => r !== null));
  if (hasResults && !parsed.data.confirmReset) {
    return NextResponse.json(
      { error: "needs-confirm", message: "Tạo lại đội sẽ xóa toàn bộ kết quả đã ghi." },
      { status: 409 }
    );
  }

  const teams = generateBalancedTeams(pool);
  // Derive once so the first-round seed participants are resolved (aTeamId/bTeamId)
  // right away — otherwise every match would render as "waiting for a team".
  const bracket = isDoubleElim
    ? { matches: deriveBracket(buildDoubleElimBracket(teams)).matches }
    : null;

  const updated = await BattleEvent.findByIdAndUpdate(
    id,
    {
      $set: {
        teams,
        groupMatchups: isDoubleElim ? [] : buildGroupMatchups(teams),
        final: null,
        bracket,
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
