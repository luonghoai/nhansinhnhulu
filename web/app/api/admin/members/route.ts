import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { toMemberDTO } from "@/lib/dto";
import { createMemberSchema } from "@/lib/validators";
import { DiscordUserNotFoundError, fetchDiscordUser } from "@/lib/discord";

export async function GET() {
  await connectToDatabase();
  const members = await Member.find().sort({ discordName: 1 });
  return NextResponse.json({ members: members.map(toMemberDTO) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const existing = await Member.findOne({ discordId: parsed.data.discordId });
  if (existing) {
    return NextResponse.json({ error: "Member already synced" }, { status: 409 });
  }

  let discordUser;
  try {
    discordUser = await fetchDiscordUser(parsed.data.discordId);
  } catch (err) {
    if (err instanceof DiscordUserNotFoundError) {
      return NextResponse.json({ error: "Discord user not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to reach Discord" }, { status: 502 });
  }

  const member = await Member.create({
    discordId: discordUser.discordId,
    discordName: discordUser.discordName,
    discordAvatar: discordUser.discordAvatar,
    syncedAt: new Date(),
  });

  return NextResponse.json({ member: toMemberDTO(member) }, { status: 201 });
}

export const dynamic = "force-dynamic";
