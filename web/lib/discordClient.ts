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

export type BattleAnnouncePayload = {
  battleId: string;
  title: string;
  description?: string | null;
  startAt: string; // ISO UTC — rendered in TEAM_TIMEZONE by this module
  status: string;
  teams: Array<{
    name: string;
    groupPoints: number;
    discordIds: string[]; // rostered members (non-null only)
  }>;
  championName?: string | null;
  existingMessageId?: string | null; // edit this message instead of posting a new one
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

/** `${SITE_URL}/#raids` with any trailing slash on SITE_URL trimmed, or null if unset. */
function landingRaidsUrl(): string | null {
  const base = process.env.SITE_URL?.replace(/\/+$/, "");
  return base ? `${base}/#raids` : null;
}

/** Thrown when the Discord REST API responds with a non-2xx status. */
export class DiscordApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    message: string,
  ) {
    super(message);
    this.name = "DiscordApiError";
  }
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
    throw new DiscordApiError(
      res.status,
      body,
      `Discord API error (${res.status}) posting to channel ${channelId}: ${body}`,
    );
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

  const detailUrl = landingRaidsUrl();
  const description = detailUrl
    ? `**Thời gian:** ${when}\n\n**Đội hình:**\n${lineup}\n\n**Chi tiết:** ${detailUrl}`
    : `**Thời gian:** ${when}\n\n**Đội hình:**\n${lineup}`;

  const payload = {
    embeds: [
      {
        title: raid.dungeonName,
        ...(detailUrl ? { url: detailUrl } : {}),
        description,
        color: ANNOUNCE_EMBED_COLOR,
        footer: { text: `Raid ID: ${raid.raidId}` },
      },
    ],
  };

  await postChannelMessage(channelId, payload);
}

/** `${SITE_URL}/3v3` with any trailing slash trimmed, or null if unset. */
function landingBattleUrl(): string | null {
  const base = process.env.SITE_URL?.replace(/\/+$/, "");
  return base ? `${base}/3v3` : null;
}

/**
 * Posts (or edits) a 3v3 battle announcement embed in BATTLE_ANNOUNCE_CHANNEL_ID,
 * @-mentioning each rostered member, with live group standings and a champion
 * highlight when completed. Returns the Discord message id so callers can edit the
 * same message later. Throws when the channel id is unset (admin-triggered action).
 */
export async function announceBattle(battle: BattleAnnouncePayload): Promise<string> {
  const channelId = process.env.RAID_ANNOUNCE_CHANNEL_ID;
  if (!channelId) {
    throw new Error("RAID_ANNOUNCE_CHANNEL_ID is not set");
  }

  const when = formatInTeamTimezone(new Date(battle.startAt));
  const detailUrl = landingBattleUrl();

  const teamLines = battle.teams
    .map((team) => {
      const mentions = team.discordIds.map((dId) => `<@${dId}>`).join(", ") || "—";
      const pts = battle.status === "draft" || battle.status === "open" ? "" : ` · ${team.groupPoints} điểm`;
      return `**${team.name}**${pts}\n${mentions}`;
    })
    .join("\n\n");

  const parts = [`**Thời gian:** ${when}`];
  if (battle.description) parts.push(battle.description);
  if (teamLines) parts.push(`**Các đội:**\n${teamLines}`);
  if (battle.championName) parts.push(`🏆 **Vô địch:** ${battle.championName}`);
  if (detailUrl) parts.push(`**Chi tiết:** ${detailUrl}`);

  const payload = {
    embeds: [
      {
        title: battle.title,
        ...(detailUrl ? { url: detailUrl } : {}),
        description: parts.join("\n\n"),
        color: ANNOUNCE_EMBED_COLOR,
        footer: { text: `Battle ID: ${battle.battleId}` },
      },
    ],
    allowed_mentions: {
      parse: [] as string[],
      users: [...new Set(battle.teams.flatMap((t) => t.discordIds))],
    },
  };

  const token = botToken();
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set");
  }

  const isEdit = Boolean(battle.existingMessageId);
  const url = isEdit
    ? `${DISCORD_API_BASE}/channels/${channelId}/messages/${battle.existingMessageId}`
    : `${DISCORD_API_BASE}/channels/${channelId}/messages`;

  const res = await fetch(url, {
    method: isEdit ? "PATCH" : "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DiscordApiError(
      res.status,
      body,
      `Discord API error (${res.status}) announcing battle ${battle.battleId}: ${body}`,
    );
  }

  const message = (await res.json()) as { id: string };
  return message.id;
}

/**
 * Sends a free-form admin message to ADMIN_MESSAGE_CHANNEL_ID. Only the explicitly
 * listed member ids are allowed to ping (`parse: []` blocks @everyone/role pings even
 * if the content contains them). No-op (logs a warning) when the channel id is unset.
 */
export async function sendAdminMessage(
  content: string,
  mentionUserIds: string[],
): Promise<void> {
  const channelId = process.env.ADMIN_MESSAGE_CHANNEL_ID;
  if (!channelId) {
    console.warn("ADMIN_MESSAGE_CHANNEL_ID not set — skipping admin message");
    throw new Error("ADMIN_MESSAGE_CHANNEL_ID is not set");
  }

  const payload = {
    content,
    allowed_mentions: { parse: [] as string[], users: mentionUserIds },
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

  const detailUrl = landingRaidsUrl();
  if (detailUrl) {
    content += `\n\nChi tiết: ${detailUrl}`;
  }

  await postDMMessage(payload.discordId, content);
}
