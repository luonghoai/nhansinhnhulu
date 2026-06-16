import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Dungeon } from "@/lib/models/Dungeon";
import { Member } from "@/lib/models/Member";
import { Raid } from "@/lib/models/Raid";
import { toRaidDTO } from "@/lib/dto";
import { createRaidSchema } from "@/lib/validators";
import { announceRaid } from "@/lib/botClient";

export async function GET() {
  await connectToDatabase();
  const raids = await Raid.find().sort({ startAt: 1 });
  return NextResponse.json({ raids: raids.map(toRaidDTO) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createRaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const dungeon = await Dungeon.findById(parsed.data.dungeonId);
  if (!dungeon) {
    return NextResponse.json({ error: "Dungeon not found" }, { status: 404 });
  }

  const slots: { index: number; roleLabel: string | null; memberId: string | null }[] =
    Array.from({ length: dungeon.size }, (_, index) => ({
      index,
      roleLabel: null,
      memberId: null,
    }));

  // Optionally roster members at creation time. Validate before merging:
  // valid indices, no member assigned twice, and every member must exist.
  const submitted = parsed.data.slots ?? [];
  const assignedMemberIds = new Set<string>();
  for (const slot of submitted) {
    if (slot.index < 0 || slot.index >= dungeon.size) {
      return NextResponse.json({ error: `Slot index out of range: ${slot.index}` }, { status: 400 });
    }
    if (slot.memberId) {
      if (assignedMemberIds.has(slot.memberId)) {
        return NextResponse.json(
          { error: "A member can only be assigned to one slot" },
          { status: 400 }
        );
      }
      assignedMemberIds.add(slot.memberId);
    }
    slots[slot.index] = {
      index: slot.index,
      roleLabel: slot.roleLabel ?? null,
      memberId: slot.memberId ?? null,
    };
  }

  let rosteredMembers: { discordId: string }[] = [];
  if (assignedMemberIds.size > 0) {
    rosteredMembers = await Member.find({ _id: { $in: [...assignedMemberIds] } }).select(
      "discordId"
    );
    if (rosteredMembers.length !== assignedMemberIds.size) {
      return NextResponse.json({ error: "One or more members not found" }, { status: 400 });
    }
  }

  const raid = await Raid.create({
    dungeonId: dungeon._id,
    size: dungeon.size,
    startAt: new Date(parsed.data.startAt),
    title: parsed.data.title ?? null,
    notes: parsed.data.notes ?? null,
    slots,
  });

  // Announce the new raid in the bot's text channel, @-mentioning rostered members.
  // Fire to the bot but never let a bot outage fail the creation (see CONTEXT.md).
  if (rosteredMembers.length > 0) {
    await announceRaid({
      raidId: raid._id.toString(),
      dungeonName: dungeon.name,
      title: raid.title ?? null,
      startAt: raid.startAt.toISOString(),
      size: raid.size as 6 | 12,
      discordIds: rosteredMembers.map((m) => m.discordId),
      landingUrl: process.env.SITE_URL ?? "",
    });
  }

  return NextResponse.json({ raid: toRaidDTO(raid) }, { status: 201 });
}

export const dynamic = "force-dynamic";
