# Deployment Guide — Nhân Sinh Như Lữ (NSNL)

How to deploy the two services to production:

- **`web/`** — Next.js (landing + admin + API) → **Vercel**
- **`bot/`** — Python `discord.py` v2 bot → **VPS** (systemd or Docker)

Both share one **MongoDB Atlas** database, but only `web/` connects to it directly
(Pattern B — the bot talks only to `web`'s `/api/bot/*` endpoints).

```
                 ┌─────────────────────────────┐
   visitors ───► │  Vercel: web/ (Next.js)     │ ──► MongoDB Atlas (M0)
                 │  landing + admin + /api/*    │
                 └──────────┬───────────▲───────┘
       X-Bot-Secret         │           │  POST {BOT_NOTIFY_URL}/notify
       /api/bot/* calls     ▼           │  (approve/reject push)
                 ┌─────────────────────────────┐
  Discord  ◄───► │  VPS: bot/ (discord.py)      │
                 │  gateway + /notify server    │
                 └─────────────────────────────┘
```

> ⚠️ **Security — rotate the committed Atlas credentials first.** `web/.env.example`
> currently contains a real-looking connection string with a username/password. Treat
> that credential as compromised: rotate the Atlas DB user password before go-live and
> never commit real secrets. `.env.example` files must hold placeholders only.

---

## 0. Prerequisites & secrets

Provision these once, before deploying either service.

### MongoDB Atlas (web only)
1. Create a free **M0** cluster.
2. Create a DB user (least privilege: read/write to the app DB).
3. **Network access:** add `0.0.0.0/0` (Vercel uses dynamic egress IPs) — or Atlas
   Dedicated + PrivateLink if you later upgrade. M0 requires the open allowlist.
4. Copy the `mongodb+srv://…` connection string → this is `MONGODB_URI`.

### Discord
1. Create an application + bot at <https://discord.com/developers/applications>.
2. Copy the **bot token** → `DISCORD_BOT_TOKEN` (used by **both** web and bot).
3. Invite the bot to your guild with the `applications.commands` and `bot` scopes.
4. Copy your dev guild's ID → `GUILD_ID` (instant slash-command sync; leave unset for
   global sync, which takes ~1h).

### Generated secrets
Generate strong random values:

```bash
# BOT_API_SECRET and SESSION_SECRET (32+ chars each)
openssl rand -hex 32

# ADMIN_PASSWORD_HASH — bcrypt hash of your chosen admin password
cd web && node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'YOUR_ADMIN_PASSWORD'
```

### Full secret inventory

| Variable | Web | Bot | Notes |
|---|:--:|:--:|---|
| `TEAM_TIMEZONE` | ✅ | ✅ | `Asia/Ho_Chi_Minh` |
| `DISCORD_BOT_TOKEN` | ✅ | ✅ | Same token both sides |
| `BOT_API_SECRET` | ✅ | ✅ | Shared secret, both directions |
| `MONGODB_URI` | ✅ | — | Web only (Pattern B) |
| `ADMIN_PASSWORD_HASH` | ✅ | — | bcrypt/argon2 hash |
| `SESSION_SECRET` | ✅ | — | Signs admin session cookie (32+ chars) |
| `BOT_NOTIFY_URL` | ✅ | — | Bot's notify **base** URL (web appends `/notify`, `/announce-raid`) |
| `SITE_URL` | ✅ | — | Public landing URL; shown in raid announcements |
| `NEXT_PUBLIC_HERO_YOUTUBE_ID` | ✅ | — | Optional; unset = gradient poster |
| `NEXT_PUBLIC_DISCORD_INVITE_URL` | ✅ | — | Optional; unset = footer link omitted |
| `GUILD_ID` | — | ✅ | Dev guild for instant command sync |
| `WEB_API_BASE_URL` | — | ✅ | e.g. `https://nsnl.vercel.app` |
| `BOT_NOTIFY_PORT` | — | ✅ | Default `8080` |
| `RAID_ANNOUNCE_CHANNEL_ID` | — | ✅ | Text channel ID for raid announcements; unset = no announcement |

> There is a chicken-and-egg dependency: the bot needs `WEB_API_BASE_URL` (the Vercel
> URL) and the web needs `BOT_NOTIFY_URL` (the VPS URL). **Deploy web first**, note its
> URL, deploy the bot, then come back and set `BOT_NOTIFY_URL` on Vercel + redeploy.

---

## 1. Deploy `web/` to Vercel

### 1.1 Import the project
1. Push the repo to GitHub.
2. In Vercel → **Add New → Project** → import the repo.
3. **Root Directory:** set to `web/` (important — the monorepo has the app under `web/`).
4. Framework preset: **Next.js** (auto-detected). Build command `next build`, output
   handled automatically — no overrides needed (`web/package.json` has standard scripts).

### 1.2 Environment variables
In **Project → Settings → Environment Variables**, add (Production scope):

```
TEAM_TIMEZONE=Asia/Ho_Chi_Minh
MONGODB_URI=mongodb+srv://…            # rotated Atlas string
DISCORD_BOT_TOKEN=…
BOT_API_SECRET=…                       # same value the bot will use
ADMIN_PASSWORD_HASH=…                  # bcrypt hash
SESSION_SECRET=…                       # 32+ chars
BOT_NOTIFY_URL=                        # leave blank for now; set after bot is up
SITE_URL=https://nsnl.vercel.app       # public landing URL, shown in raid announcements
NEXT_PUBLIC_HERO_YOUTUBE_ID=…          # optional
NEXT_PUBLIC_DISCORD_INVITE_URL=…       # optional
```

> `NEXT_PUBLIC_*` vars are inlined at build time — changing them later requires a
> **redeploy**, not just a save.

> ⚠️ **Dungeon banner uploads need a persistent filesystem.** Admin banner uploads are
> written to `web/public/assets/dungeons/` and served statically. This works on a VPS or
> Docker (with a mounted volume), but **not on Vercel** — its runtime filesystem is
> read-only and ephemeral, so uploads there fail and don't persist. Host `web/` on a
> persistent server if you rely on banner uploads, or pre-commit banner files to the repo.

### 1.3 Deploy & verify
1. Click **Deploy**. Wait for the build (`next build`) to pass.
2. Verify:
   - `GET /` → landing renders (200).
   - `GET /admin` (unauthenticated) → **307** redirect to `/admin/login`.
   - `GET /admin/login` → 200; log in with your admin password.
   - `GET /api/public/raids/nearest` → `{ "raids": [...] }`.

### 1.4 Seed the database (once)
Run the seed against the live cluster from your machine (Vercel build has no shell):

```bash
cd web
echo "MONGODB_URI=mongodb+srv://…" > .env.local   # the rotated prod string
npm install
npm run seed                                       # clears + reseeds the 4 collections
```

> ⚠️ `npm run seed` **clears** `members`, `dungeons`, `raids`, `joinRequests` before
> inserting fixtures. Run it only for initial setup, never against populated prod data.

---

## 2. Deploy `bot/` to a VPS

Vercel cannot host the bot (it needs a long-lived gateway connection + an inbound HTTP
port). Use any small Linux VPS. Two options below — pick one.

### Common: open the notify port
The web app POSTs approve/reject decisions to `{BOT_NOTIFY_URL}/notify`. The bot's
`/notify` server listens on `BOT_NOTIFY_PORT` (default `8080`). Make it reachable from
Vercel:

- Open the port in the VPS firewall / security group, **and**
- Strongly recommended: put it behind a reverse proxy (nginx/Caddy) with **HTTPS** on a
  hostname, e.g. `https://bot.example.com`. Then set `BOT_NOTIFY_URL=https://bot.example.com`
  (no `/notify` suffix — web appends it). The `/notify` route is already guarded by
  `BOT_API_SECRET`, but TLS prevents the secret crossing the wire in plaintext.

### Option A — systemd

```bash
# on the VPS
git clone <repo-url> /opt/nsnl && cd /opt/nsnl/bot
python3.11 -m venv .venv
.venv/bin/pip install -e .

# create the env file (NOT committed)
cat > /opt/nsnl/bot/.env <<'EOF'
DISCORD_BOT_TOKEN=…
BOT_API_SECRET=…                 # same value as the web's BOT_API_SECRET
TEAM_TIMEZONE=Asia/Ho_Chi_Minh
GUILD_ID=…
WEB_API_BASE_URL=https://nsnl.vercel.app
BOT_NOTIFY_PORT=8080
RAID_ANNOUNCE_CHANNEL_ID=…        # text channel ID for raid announcements (optional)
EOF
chmod 600 /opt/nsnl/bot/.env
```

Create `/etc/systemd/system/nsnl-bot.service`:

```ini
[Unit]
Description=NSNL Discord bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/nsnl/bot
EnvironmentFile=/opt/nsnl/bot/.env
ExecStart=/opt/nsnl/bot/.venv/bin/python main.py
Restart=on-failure
RestartSec=5
User=nsnl
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd -r -s /usr/sbin/nologin nsnl && sudo chown -R nsnl /opt/nsnl
sudo systemctl daemon-reload
sudo systemctl enable --now nsnl-bot
sudo journalctl -u nsnl-bot -f          # watch logs; expect "ready" / command sync
```

### Option B — Docker

`bot/Dockerfile` (create if not present):

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY . .
EXPOSE 8080
CMD ["python", "main.py"]
```

```bash
cd bot
docker build -t nsnl-bot .
docker run -d --name nsnl-bot --restart unless-stopped \
  -p 8080:8080 --env-file .env nsnl-bot
docker logs -f nsnl-bot
```

---

## 3. Wire the two together

1. With the bot running and reachable, go back to **Vercel → env vars** and set
   `BOT_NOTIFY_URL` to the bot's base URL (e.g. `https://bot.example.com`).
2. **Redeploy** the web project so the new value takes effect.
3. Confirm `WEB_API_BASE_URL` on the bot points at the live Vercel URL (redeploy/restart
   the bot if you change it).

---

## 4. Production smoke test (end-to-end)

1. **Slash commands appear** in the guild (instant if `GUILD_ID` set, else ~1h global).
2. `/raids` → pick a raid → **Request to join** → bot confirms "pending".
3. Admin dashboard → **Requests** → the request shows up → **Approve**.
4. Web POSTs to `{BOT_NOTIFY_URL}/notify` → member receives an **approval DM**.
5. `/myplan` → the approved raid now shows in the member's plan.
6. Landing `/` → the rostered member appears in the nearest-raid roster.
7. Reject path: repeat 2–4 with **Reject** → member gets a rejection DM, no roster change.

If step 4 fails, check: `BOT_API_SECRET` matches on both sides, `BOT_NOTIFY_URL` is the
base URL (no `/notify`), the port is open, and the bot logs show the inbound POST.

---

## 5. Operations runbook

| Task | How |
|---|---|
| View bot logs | `journalctl -u nsnl-bot -f` (systemd) / `docker logs -f nsnl-bot` |
| Restart bot | `systemctl restart nsnl-bot` / `docker restart nsnl-bot` |
| Update bot | `git pull` → `pip install -e .` → restart (or rebuild image) |
| Update web | Push to the default branch → Vercel auto-deploys |
| Rotate `BOT_API_SECRET` | Change on Vercel **and** bot env together, then redeploy/restart both |
| Health check | `GET {BOT_NOTIFY_URL}/health` → 200 |
| Admin lockout | Regenerate `ADMIN_PASSWORD_HASH`, update Vercel env, redeploy |

### Deploy order recap
1. Provision Atlas + Discord + generated secrets (§0).
2. Deploy web to Vercel, leave `BOT_NOTIFY_URL` blank (§1).
3. Seed the DB once (§1.4).
4. Deploy the bot to the VPS with `WEB_API_BASE_URL` = the Vercel URL (§2).
5. Set `BOT_NOTIFY_URL` on Vercel → redeploy (§3).
6. Run the end-to-end smoke test (§4).
