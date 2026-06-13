# Prompt — Bot Agent (Python Discord bot)

You build the **Python `discord.py` bot** for NSNL. It runs as a long-lived service on a
**VPS**. **Pattern B:** it reads/writes ONLY through the web `/api/bot/*` endpoints (shared
secret) — never touches Mongo directly — and runs a tiny `/notify` HTTP server the web app
pushes approve/reject decisions to.

## Read first
- `.ai/CONTEXT.md` (domain + glossary), `.ai/planning/02-data-model.md` (the data contract),
  `.ai/planning/05-discord-bot.md` (bot spec), `.ai/planning/06-api-contract.md`.
- `.ai/skills/discord-bot.md` (how to build). `.ai/rules/engineering.md` + `security.md`.

## What to build
- `/myplan` — show the caller's rostered raids from now → end of week (ephemeral embed).
  If the caller has no member record, auto-create a minimal one
  (`discordId`, `discordName`, `discordAvatar`; class/icon left null for admin).
- `/raids` — list upcoming raids in a select menu (dungeon + day/time + fill x/size);
  on select show detail + a **"Request to join"** button; on click, guard against
  (already rostered / already pending / raid full), then create a `JoinRequest` (pending).
  Confirm ephemerally: waiting for admin approval.
- **Decision notifications (PUSH):** run a tiny aiohttp/FastAPI server (`BOT_NOTIFY_PORT`)
  with `POST /notify` guarded by `X-Bot-Secret`; on `{discordId, decision, raidId, reason?}`
  DM the member. Return 200 even if DMs are blocked (log it). Run it alongside the bot client.
- (Optional) `/sync` — refresh the caller's name/avatar.

## Rules & constraints
- Python 3.11+, `discord.py` v2, `httpx` (web API), `aiohttp`/`fastapi` (/notify). NO motor.
- All data access via `/api/bot/*` with header `X-Bot-Secret`. The web app enforces guards
  (dup requests, full raid, already rostered) — surface its responses to the user nicely.
- Store Discord IDs as **strings**. Render all times in `TEAM_TIMEZONE` (`Asia/Ho_Chi_Minh`).
- The bot NEVER adds a member to a roster directly — only creates pending requests.
- Catch/log errors per interaction; never crash the loop. Handle DM-blocked users gracefully.

## Config (env)
`DISCORD_BOT_TOKEN`, `GUILD_ID` (dev fast-sync), `WEB_API_BASE_URL`, `BOT_API_SECRET`,
`BOT_NOTIFY_PORT`, `TEAM_TIMEZONE`. No `MONGODB_URI` on the bot. Never log full tokens.

## Deploy (VPS)
systemd unit or Docker on a VPS. Not Vercel. Expose `/notify` where the web can reach it.
Restart-safe, stateless.

## Done means
Ruff + Black clean; bot connects to Discord, reaches `/api/bot/*` with the shared secret,
commands appear in the dev guild; a member with no prior record can run `/raids`, request a
join, see it pending; and when the web posts to `/notify`, the member gets the DM.
