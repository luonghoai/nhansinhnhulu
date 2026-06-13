import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { toMemberDTO } from "@/lib/dto";
import { ensureMemberSchema } from "@/lib/validators";
import { requireBotSecret } from "@/lib/botAuth";

export async function POST(request: Request) {
  const unauthorized = requireBotSecret(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = ensureMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const member = await Member.findOneAndUpdate(
    { discordId: parsed.data.discordId },
    {
      $setOnInsert: {
        discordId: parsed.data.discordId,
        discordName: parsed.data.discordName,
        discordAvatar: parsed.data.discordAvatar,
        class: null,
        classIcon: null,
        isActive: true,
        syncedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ member: toMemberDTO(member) });
}

export const dynamic = "force-dynamic";
