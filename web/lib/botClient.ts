export type JoinRequestDecision = "approved" | "rejected";

interface NotifyPayload {
  discordId: string;
  decision: JoinRequestDecision;
  raidId: string;
  reason?: string;
}

/**
 * Pushes an approve/reject decision to the bot's `/notify` endpoint.
 * Returns true if the bot acknowledged (200), false otherwise. Never throws —
 * the web app must keep working even if the bot is unreachable (see CONTEXT.md).
 */
export async function notifyBot(payload: NotifyPayload): Promise<boolean> {
  return postToBot("/notify", payload);
}

interface RaidAnnouncement {
  raidId: string;
  dungeonName: string;
  title: string | null;
  startAt: string; // ISO (UTC) — the bot renders it in TEAM_TIMEZONE
  size: 6 | 12;
  discordIds: string[]; // rostered members to @-mention
  landingUrl: string; // public landing page URL ("" if not configured)
}

/**
 * Asks the bot to announce a newly scheduled raid in its configured text channel,
 * @-mentioning every rostered member. Returns true if the bot acknowledged (200).
 * Never throws — raid creation must succeed even when the bot is unreachable.
 */
export async function announceRaid(payload: RaidAnnouncement): Promise<boolean> {
  return postToBot("/announce-raid", payload);
}

async function postToBot(path: string, payload: unknown): Promise<boolean> {
  const baseUrl = process.env.BOT_NOTIFY_URL;
  const secret = process.env.BOT_API_SECRET;
  if (!baseUrl || !secret) return false;

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": secret,
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
