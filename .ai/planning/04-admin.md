# 04 — Admin Dashboard Spec

Auth-gated under `/admin`. **Simple password** auth (single trusted admin in v1).

---

## Auth (simple password)
- `/admin/login` page: password field only.
- Compare against `ADMIN_PASSWORD_HASH` (env). On success, set an **httpOnly, signed
  session cookie** (iron-session or a signed JWT). No Discord OAuth in v1.
- Middleware guards all `/admin/*` pages and admin `/api/*` handlers: invalid/absent cookie
  → redirect to `/admin/login`.
- Rate-limit the login route. Never log the password. Re-validate the cookie on every request.

---

## Pages

### A. Members (`/admin/members`)
**List** all synced members (table or card grid):
avatar, discordName, discordId, class, classIcon (rendered), isActive, syncedAt.

**Add member by Discord ID:**
1. Admin pastes a Discord ID.
2. Server calls Discord REST (bot token) → fetch `discordName` + `avatar`.
3. Create member with synced fields; class/classIcon empty.
4. Admin then sets class + classIcon (dropdown of known classes/icon keys).

**Update member:** edit class, classIcon, isActive; re-sync name/avatar button.

**Delete member:** soft-delete (`isActive=false`) preferred; hard delete option with
confirmation; on hard delete, null any raid slots referencing them.

**Errors:** invalid ID, Discord user not found, duplicate (already synced).

### B. Dungeons (`/admin/dungeons`)
Master data CRUD:
- Create: name, size (6/12), description, optional imageKey.
- Edit / deactivate / delete (block delete if raids reference it, or cascade per Open Q).

### C. Raids (`/admin/raids`)
**Create raid:**
- Pick a dungeon → `size` auto-filled from dungeon.
- Set `startAt` (date + time, team TZ; stored UTC).
- Roster builder: `size` slots; assign a member per slot (searchable member picker);
  optional role label per slot; leave slots open.
- Save → creates raid with `slots[]`.

**Manage raids:**
- List this week's raids (grouped by day), with size badge, time, fill count (x/size).
- Edit roster, change time, cancel/complete.
- Support **many raids per week**, mixed 6/12.

### D. Join Requests (`/admin/requests`)
- List **pending** requests: requester (avatar+name), target raid (dungeon+time),
  requested at, optional preferred slot.
- **Approve:** place member into a free slot of that raid (or chosen slot) →
  set request `approved`, `decidedAt` → **call the bot `/notify` endpoint** so the member is
  DM'd immediately, then set `notifiedAt`. If no free slot → warn admin (don't approve).
- **Reject:** set `rejected` (+ optional reason) → call bot `/notify` → set `notifiedAt`.
- History view (approved/rejected) optional.

---

## API endpoints (route handlers, admin-guarded)
> These serve the admin UI. The bot uses the separate `/api/bot/*` endpoints (Pattern B).
> Admin handlers are guarded by the admin session cookie; bot handlers by `X-Bot-Secret`.

```
POST   /api/admin/members            { discordId }            → sync+create
GET    /api/admin/members
PATCH  /api/admin/members/:id        { class, classIcon, isActive }
POST   /api/admin/members/:id/resync                          → re-pull name/avatar
DELETE /api/admin/members/:id

GET/POST/PATCH/DELETE /api/admin/dungeons[/:id]

GET/POST/PATCH/DELETE /api/admin/raids[/:id]
PATCH  /api/admin/raids/:id/slots    { slots[] }

GET    /api/admin/requests?status=pending
POST   /api/admin/requests/:id/approve { slotIndex? }   # places member + pushes bot /notify
POST   /api/admin/requests/:id/reject  { reason? }      # pushes bot /notify
```

## UX requirements
- Clean, dense, fast admin UI (tables, modals, toasts).
- Optimistic updates where safe; confirm destructive actions.
- Class & classIcon chosen from a controlled list — `NSNL_CLASSES` in `web/lib/classes.ts`
  (single source of truth for the 7 class names ↔ icon keys). The class `<select>` auto-fills
  `classIcon` via `iconKeyForClass`; the icon column previews `classIconSrc(classIcon)`.
- Validation: raid roster can't exceed `size`; member required fields.

## Dependencies
- Discord **bot token** with permission to fetch user objects by ID (shared with the bot).
- `ADMIN_PASSWORD_HASH`, session cookie secret.
- `BOT_NOTIFY_URL` + `BOT_API_SECRET` to push decisions to the bot.
- Controlled list of class names ↔ classIcon keys (shared with landing) → `web/lib/classes.ts`.
