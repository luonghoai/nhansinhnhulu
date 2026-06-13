# Skill — Building the Python Discord Bot

## Setup
- Python 3.11+. Deps: `discord.py>=2.4`, `httpx` (call web API), `aiohttp` or `fastapi`+`uvicorn`
  (the /notify server), `python-dotenv`, `zoneinfo`.
- NO `motor`/Mongo on the bot — it talks only to the web `/api/bot/*` (Pattern B).
- `pyproject.toml`. Ruff + Black for lint/format.

## Structure
```
bot/
  main.py                # entrypoint: load env, start bot
  bot/
    client.py            # commands.Bot subclass, on_ready, command sync
    api.py               # httpx client wrapping /api/bot/* (X-Bot-Secret)
    notify_server.py     # tiny aiohttp/FastAPI server: POST /notify -> DM member
    time_utils.py        # render times in TEAM_TIMEZONE
    commands/
      myplan.py
      raids.py
    views/
      raid_select.py     # discord.ui.Select + Button views
  .env.example
```

## Bot client
- Subclass `commands.Bot` with the needed intents (default + members if required).
- Sync slash commands to `GUILD_ID` in dev (instant); global sync for prod.
- `on_ready` logs the connected user; idempotent setup.

## API client helpers (httpx → web /api/bot/*)
- `ensure_member(user)` → POST /api/bot/members/ensure
- `upcoming_raids()` → GET /api/bot/raids/upcoming
- `member_plan(discord_id)` → GET /api/bot/members/:discordId/plan
- `create_join_request(raid_id, discord_id)` → POST /api/bot/requests
- All calls send `X-Bot-Secret`. Discord IDs are strings. No direct DB access.

## Commands
- `/myplan`: resolve member → list this-week raids in an embed (ephemeral).
- `/raids`: build a `Select` of upcoming raids → on pick show detail + "Request to join"
  button → on click, guard (already in / already pending / full) then create request.
- Keep responses **ephemeral** so channels stay clean.

## Notifications (PUSH — /notify server)
- Run a tiny aiohttp/FastAPI server (`BOT_NOTIFY_PORT`) with `POST /notify` guarded by
  `X-Bot-Secret`. On call `{discordId, decision, raidId, reason?}` → DM the member.
- Return 200 even if the DM is blocked (log it) so the web can still mark `notifiedAt`.
- Run the server concurrently with the discord.py client (same event loop / asyncio.gather).

## Guards & UX
- Never create duplicate pending requests for the same (raid, member).
- Friendly messages for: not synced (auto-created), raid full, already rostered.
- All times rendered in TEAM_TIMEZONE.

## Run / deploy (VPS)
- Local: `python main.py` with `.env` (point `WEB_API_BASE_URL` at local web).
- Prod: VPS via systemd unit or Docker. Expose `/notify` on a host/port the web can reach
  (public hostname + secret, or tunnel). Auto-restart; stateless.

## Quality gates
- Ruff + Black clean. Bot connects to Discord, reaches the web API, commands appear in the
  dev guild, and `/notify` DMs a member when the web posts a decision.
