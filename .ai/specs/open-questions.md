# Decisions Log (was: Open Questions) — RESOLVED

All v1 decisions are locked. ✅ = decided by owner on this pass.

---

## Product
1. ✅ **Nearest raid on landing:** show nearest **one of each size** (one 6p + one 12p).
2. ✅ **"Upcoming" in `/raids` (bot):** **now → end of week**.
3. ✅ **Slot role labels:** optional free-text label, can be left blank.
4. ✅ **Multiple raids same dungeon/day:** allowed.
5. ✅ **Member in overlapping raids:** allow, **no overlap check in v1**.

## Identity & access
6. ✅ **Admin auth:** **simple password** (single shared admin password via env).
   → NOT NextAuth/Discord OAuth. See security note below.
7. ⏳ **Admins:** owner provides admin password (and optionally a list later).

## Integration
8. ✅ **Integration:** **Pattern B** — the bot calls the Next.js API with a shared secret.
9. ✅ **Decision notifications:** **push** — web calls a bot endpoint on approve/reject.
10. ✅ **Discord token:** **one bot application/token** shared by web (user fetch) and bot.

## Data lifecycle
11. ✅ **Delete member:** **soft** (`isActive=false`).
12. ✅ **Delete dungeon referenced by raids:** **block**.
13. ✅ **Past raids:** **keep as history**, no daily job. (Treat `startAt < now` as past on read.)

## Content / assets (owner provides later)
14. ⏳ YouTube video ID — provide later (use placeholder).
15. ⏳ Class list + classIcon keys + icon image files — provide later (use placeholders).
16. ⏳ Team intro copy, tagline, logo, palette/brand — provide later (use placeholders).
17. ⏳ Discord invite link (footer) — provide later (optional).

## Hosting
18. ✅ **Bot host:** **VPS** (systemd service / Docker on a VPS).
19. ✅ **MongoDB:** **Atlas free tier (M0)**.

---

## Consequences of these choices (read before building)

### Simple-password admin auth (Q6)
- Replace NextAuth/Discord OAuth with a single admin password.
- Implement as a login route that sets an **httpOnly, signed session cookie**
  (e.g. `iron-session` or a signed JWT cookie). Compare against `ADMIN_PASSWORD` (env),
  ideally stored as a hash (`ADMIN_PASSWORD_HASH`).
- Middleware guards all `/admin/*` pages and admin `/api/*` handlers: no valid cookie → redirect to `/admin/login`.
- Rate-limit the login route; never log the password.
- This is acceptable for v1 (single trusted admin). Revisit OAuth if multiple admins needed.

### Pattern B + push notifications (Q8, Q9)
- The **Next.js API is the single source of business logic**. The bot does NOT write Mongo directly.
- Bot → web: all reads/writes via `/api/bot/*` with header `X-Bot-Secret: <BOT_API_SECRET>`.
- Web → bot: on approve/reject, web POSTs to a small **bot HTTP endpoint** (the bot runs a tiny
  aiohttp/FastAPI server alongside discord.py) so the member is DM'd immediately. Secure with the
  same shared secret. No polling loop needed.
- Implication: the **web app must be up** for the bot to function. Acceptable for v1.

### VPS bot (Q18)
- Bot runs as a long-lived service on a VPS (systemd unit or Docker). Must also expose its
  notify endpoint on a port reachable by Vercel (or via a tunnel/public hostname + secret).
