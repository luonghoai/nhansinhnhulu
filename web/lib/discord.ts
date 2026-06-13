const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator: string;
}

export interface FetchedDiscordUser {
  discordId: string;
  discordName: string;
  discordAvatar: string;
}

export class DiscordUserNotFoundError extends Error {
  constructor(discordId: string) {
    super(`Discord user not found: ${discordId}`);
    this.name = "DiscordUserNotFoundError";
  }
}

/** Server-only: fetch a Discord user's display name + avatar URL by snowflake ID. */
export async function fetchDiscordUser(discordId: string): Promise<FetchedDiscordUser> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set");
  }

  const res = await fetch(`${DISCORD_API_BASE}/users/${discordId}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new DiscordUserNotFoundError(discordId);
  }
  if (!res.ok) {
    throw new Error(`Discord API error (${res.status}) fetching user ${discordId}`);
  }

  const user = (await res.json()) as DiscordUser;
  return {
    discordId: user.id,
    discordName: user.global_name || user.username,
    discordAvatar: buildAvatarUrl(user),
  };
}

function buildAvatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}`;
  }
  // Default avatar index, per Discord's CDN docs (modern usernames use (id >> 22) % 6).
  const index = (BigInt(user.id) >> BigInt(22)) % BigInt(6);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
