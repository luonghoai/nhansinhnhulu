import { formatInTeamTimezone } from "@/lib/time";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/** Orange — guild brand colour placeholder (decimal of #FF8C00). */
const ANNOUNCE_EMBED_COLOR = 16750848;

export type RaidAnnouncePayload = {
  raidId: string;
  dungeonName: string;
  startAt: string; // ISO UTC — rendered in TEAM_TIMEZONE by this module
  slots: Array<{
    index: number;
    discordId: string; // non-null members only
    roleLabel: string | null;
  }>;
};

export type DecisionNotifyPayload = {
  discordId: string;
  decision: "approved" | "rejected";
  dungeonName: string;
  startAt: string; // ISO UTC
  reason?: string | null; // for rejections
};

function botToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN || null;
}

/**
 * Server-only: POST a message payload to a Discord channel using the bot token.
 * Throws on non-2xx so callers can log; never call from client code.
 */
export async function postChannelMessage(channelId: string, payload: object): Promise<void> {
  const token = botToken();
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set");
  }

  const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord API error (${res.status}) posting to channel ${channelId}: ${body}`);
  }
}

/**
 * Server-only: open (or reuse) a DM channel with a user. Discord deduplicates,
 * so this is idempotent. Returns the DM channel id.
 */
export async function openDMChannel(discordId: string): Promise<string> {
  const token = botToken();
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set");
  }

  const res = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: discordId }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord API error (${res.status}) opening DM with ${discordId}: ${body}`);
  }

  const channel = (await res.json()) as { id: string };
  return channel.id;
}

/** Server-only: open a DM channel with the user and send a plain-text message. */
export async function postDMMessage(discordId: string, content: string): Promise<void> {
  const dmChannelId = await openDMChannel(discordId);
  await postChannelMessage(dmChannelId, { content });
}

/**
 * Posts a raid announcement embed into RAID_ANNOUNCE_CHANNEL_ID, @-mentioning each
 * rostered member. No-op (logs a warning) when the channel id is unset.
 */
export async function announceRaid(raid: RaidAnnouncePayload): Promise<void> {
  const channelId = process.env.RAID_ANNOUNCE_CHANNEL_ID;
  if (!channelId) {
    console.warn("RAID_ANNOUNCE_CHANNEL_ID not set — skipping raid announcement");
    return;
  }

  const when = formatInTeamTimezone(new Date(raid.startAt));
  const lineup = raid.slots
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((slot) => {
      const label = slot.roleLabel ? ` [${slot.roleLabel}]` : "";
      return `- Slot ${slot.index + 1}${label}: <@${slot.discordId}>`;
    })
    .join("\n");

  const payload = {
    embeds: [
      {
        title: raid.dungeonName,
        description: `**Thời gian:** ${when}\n\n**Đội hình:**\n${lineup}`,
        color: ANNOUNCE_EMBED_COLOR,
        footer: { text: `Raid ID: ${raid.raidId}` },
      },
    ],
  };

  await postChannelMessage(channelId, payload);
}

/** DMs a member the outcome of their join request (approved/rejected). */
export async function notifyDecision(payload: DecisionNotifyPayload): Promise<void> {
  const when = formatInTeamTimezone(new Date(payload.startAt));
  let content: string;
  if (payload.decision === "approved") {
    content = `✅ Yêu cầu tham gia raid **${payload.dungeonName}** (${when}) của bạn đã được **chấp thuận**!`;
  } else {
    const reason = payload.reason ? ` ${payload.reason}` : "";
    content = `❌ Yêu cầu tham gia raid **${payload.dungeonName}** (${when}) của bạn đã bị **từ chối**.${reason}`;
  }

  await postDMMessage(payload.discordId, content);
}
