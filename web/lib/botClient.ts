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
  const baseUrl = process.env.BOT_NOTIFY_URL;
  const secret = process.env.BOT_API_SECRET;
  if (!baseUrl || !secret) return false;

  try {
    const res = await fetch(`${baseUrl}/notify`, {
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
