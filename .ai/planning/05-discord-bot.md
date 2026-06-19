# 05 — Discord Bot Spec

Python `discord.py` v2. Separate service on a **VPS**. **Pattern B:** the bot talks to data
ONLY through the web `/api/bot/*` endpoints (shared secret) — it does NOT touch Mongo directly.
It is a **pure interaction handler** with no inbound HTTP server; approve/reject DMs and raid
announcements are sent by the web app via the Discord REST API (see `07-raid-announce.md`).

---

## Responsibilities
1. Let a member **view their plan** (rostered raids) from now → end of week.
2. Let a member **browse upcoming raids** and **request to join** one.
3. **Auto-create** a minimal member record on first interaction if not synced.
4. Create **JoinRequest (pending)**; surface decision back to the member.

The bot **never** auto-adds a member to a roster — admin approval required.

---

## Commands / interactions

### `/myplan`
- Resolve member by `interaction.user.id` (Discord ID).
- If not synced → auto-create minimal member (`discordId`, `discordName`, `avatar`).
- Query raids where this member is in any slot AND `startAt` between now and end-of-week.
- Reply (ephemeral) with an embed list: dungeon name, date/time (team TZ), slot/role.
- Empty state: "You have no raids planned this week."

### `/raids`
- List upcoming raids (now → end of week, or all scheduled — see Open Q),
  via a **select menu** (label: dungeon + day/time + fill x/size).
- On select → show raid detail + a **"Request to join"** button.
- On button:
  - Ensure member exists (auto-create if needed).
  - Guard: already rostered? already has a pending request for this raid? raid full?
    → respond with the appropriate message, don't create a dup.
  - Else create `JoinRequest{ status: pending }`.
  - Confirm ephemerally: "Request sent — waiting for admin approval."

### Decision notifications
- **No bot HTTP server.** The web app sends DMs and channel announcements by calling the
  Discord REST API directly using `DISCORD_BOT_TOKEN`. The bot does not expose a `/notify`
  endpoint and does not need to be reachable by the web app.
- See `07-raid-announce.md` for the full Discord REST integration design.

### (Optional) `/me` or `/sync`
- Force a profile sync (refresh name/avatar) — nice-to-have.

---

## Auto-create member (first-touch)
On any interaction by an unknown Discord user:
```
member = {
  discordId: str(user.id),
  discordName: user.global_name or user.name,
  discordAvatar: str(user.display_avatar.url),
  class: None, classIcon: None, isActive: True,
  syncedAt: now
}
```
Admin later fills class/classIcon in the dashboard.

---

## Data access (HTTP client → web API, NOT motor)
- The bot calls `/api/bot/*` on the web app with header `X-Bot-Secret`.
- Use an async HTTP client (`aiohttp`/`httpx`). Helpers wrap each endpoint:
  - `ensure_member(user)` → `POST /api/bot/members/ensure`
  - `upcoming_raids()` → `GET /api/bot/raids/upcoming`
  - `member_plan(discord_id)` → `GET /api/bot/members/:discordId/plan`
  - `create_join_request(raid_id, discord_id)` → `POST /api/bot/requests`
- All Discord IDs are strings. No direct Mongo access from the bot.

## Edge cases
- Member requests a raid that fills before approval → admin sees "no free slot" on approve.
- Duplicate requests → block via guard + (optionally) partial-unique index.
- Member left the guild → bot can't DM; mark notify failed, continue.
- Timezone: render in `Asia/Ho_Chi_Minh`; compute week boundaries in that TZ.

## Bot config / secrets
- `DISCORD_BOT_TOKEN`, `GUILD_ID` (fast command sync in dev),
  `WEB_API_BASE_URL` (where `/api/bot/*` lives), `BOT_API_SECRET` (shared with web),
  `TEAM_TIMEZONE` (default `Asia/Ho_Chi_Minh`).
- No `MONGODB_URI` on the bot (Pattern B). No `BOT_NOTIFY_PORT` — bot has no HTTP server.

## Deployment (VPS)
- Long-running process on a **VPS**: systemd unit or Docker. Vercel is NOT suitable.
- **No inbound HTTP server** — the bot only makes outbound calls to `/api/bot/*` and to
  Discord. Notifications are sent by the web app via the Discord REST API (see
  `07-raid-announce.md`). Health log on ready; auto-reconnect; restart-safe.

## Commands summary
| Command | Who | Effect |
|---------|-----|--------|
| `/myplan` | member | shows their raids this week |
| `/raids` | member | browse + request to join (creates pending request) |
| `/sync` (opt) | member | refresh their name/avatar |
