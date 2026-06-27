import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { sendMessageSchema } from "@/lib/validators";
import { DiscordApiError, sendAdminMessage } from "@/lib/discordClient";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!process.env.ADMIN_MESSAGE_CHANNEL_ID) {
    return NextResponse.json(
      { error: "ADMIN_MESSAGE_CHANNEL_ID is not configured" },
      { status: 503 },
    );
  }

  const { content, mentionUserIds } = parsed.data;

  await connectToDatabase();

  // Never trust the client with raw snowflakes — only ping ids that map to an
  // active synced member.
  let allowedMentionIds: string[] = [];
  if (mentionUserIds.length > 0) {
    const uniqueIds = [...new Set(mentionUserIds)];
    const members = await Member.find({
      discordId: { $in: uniqueIds },
      isActive: { $ne: false },
    }).select("discordId");
    allowedMentionIds = members.map((m) => m.discordId);
  }

  try {
    await sendAdminMessage(content, allowedMentionIds);
  } catch (err) {
    console.error("Failed to send admin message", err);
    if (err instanceof DiscordApiError && err.status === 403) {
      return NextResponse.json(
        {
          error:
            "Bot lacks permission to post in the configured channel. Grant it View Channel + Send Messages on ADMIN_MESSAGE_CHANNEL_ID.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Failed to send message to Discord" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
