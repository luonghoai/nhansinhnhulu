import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { toMemberDTO } from "@/lib/dto";
import { DiscordUserNotFoundError, fetchDiscordUser } from "@/lib/discord";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  await connectToDatabase();

  const member = await Member.findById(id);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  let discordUser;
  try {
    discordUser = await fetchDiscordUser(member.discordId);
  } catch (err) {
    if (err instanceof DiscordUserNotFoundError) {
      return NextResponse.json({ error: "Discord user not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to reach Discord" }, { status: 502 });
  }

  member.discordName = discordUser.discordName;
  member.discordAvatar = discordUser.discordAvatar;
  member.syncedAt = new Date();
  await member.save();

  return NextResponse.json({ member: toMemberDTO(member) });
}

export const dynamic = "force-dynamic";
