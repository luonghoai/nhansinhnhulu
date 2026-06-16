# NSNL Discord bot

Python `discord.py` v2 bot for **Nhân Sinh Như Lữ**. **Pattern B:** it has no
database access — it talks only to the web app's `/api/bot/*` endpoints with a
shared `X-Bot-Secret`, and runs a tiny `/notify` server the web pushes
approve/reject decisions to.

## Commands

| Command | Effect |
|---------|--------|
| `/myplan` | Show your rostered raids from now → end of week (ephemeral). |
| `/raids`  | Browse upcoming raids in a select menu → request to join one. |

A member is auto-synced into the web DB on first interaction (`/api/bot/members/ensure`);
admins fill in class/icon later. Join requests are created `pending` — the bot never
adds anyone to a roster.

## Setup

```bash
cd bot
python -m venv .venv
.venv\Scripts\activate        # Windows; use `source .venv/bin/activate` on POSIX
pip install -e .              # or: pip install discord.py httpx aiohttp python-dotenv
cp .env.example .env          # then fill in DISCORD_BOT_TOKEN, BOT_API_SECRET, WEB_API_BASE_URL
python main.py
```

Set `GUILD_ID` for instant slash-command sync while developing (global sync can take ~1h).

## Lint / format

```bash
pip install ruff black
ruff check .
black --check .
```

## Deploy (VPS)

Long-running process via systemd or Docker (Vercel is not suitable). Expose the
`/notify` port (`BOT_NOTIFY_PORT`, default 8080) on a hostname the web app can reach,
and point the web's `BOT_NOTIFY_URL` at it (base URL, no `/notify` suffix — the web
appends it).
