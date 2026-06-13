# 06 — API / Data Contract

Defines the shared shapes and endpoints. **Integration = Pattern B (decided).** The bot does
NOT touch Mongo directly — it calls `/api/bot/*` on the Next.js app with a shared secret.
The web app, in turn, **pushes** decision notifications to the bot's `/notify` endpoint.

---

## Shared DTOs (TypeScript-ish, language-neutral)

```ts
type Member = {
  id: string;            // ObjectId hex
  discordId: string;
  discordName: string;
  discordAvatar: string;
  class: string | null;
  classIcon: string | null;
  isActive: boolean;
  syncedAt: string;      // ISO
};

type Dungeon = {
  id: string;
  name: string;
  size: 6 | 12;
  description?: string;
  imageKey?: string | null;
  isActive: boolean;
};

type Slot = {
  index: number;
  roleLabel: string | null;
  memberId: string | null;
};

type Raid = {
  id: string;
  dungeonId: string;
  size: 6 | 12;
  startAt: string;       // ISO (UTC)
  title?: string | null;
  notes?: string | null;
  slots: Slot[];
  status: "scheduled" | "completed" | "cancelled";
};

type JoinRequest = {
  id: string;
  raidId: string;
  memberId: string;
  discordId: string;
  status: "pending" | "approved" | "rejected";
  requestedSlotIndex?: number | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  notifiedAt?: string | null;
};
```

---

## Public (landing) read endpoints
```
GET /api/public/raids/nearest        → Raid (populated dungeon + member slots), nearest only
   query: ?perSize=true  → returns nearest 6p and nearest 12p (see Open Q)
```
Response includes resolved member mini-objects:
```ts
{ raid: Raid, dungeon: Dungeon, members: Record<string, Member> }
```

---

## Admin endpoints (session-guarded) — see 04-admin.md for the full list
Members, Dungeons, Raids, Requests CRUD + approve/reject.

---

## Bot → Web endpoints (REQUIRED — Pattern B)
All require header `X-Bot-Secret: <BOT_API_SECRET>`. Reject otherwise.
```
POST /api/bot/members/ensure          { discordId, discordName, discordAvatar } → Member
                                        (auto-creates minimal member if missing)
GET  /api/bot/raids/upcoming          → Raid[] (now → end of week, populated dungeon)
GET  /api/bot/members/:discordId/plan → Raid[] for that member, now → end of week
POST /api/bot/requests                { raidId, discordId } → JoinRequest (pending)
                                        (guards: already rostered / already pending / full)
```

## Web → Bot endpoint (REQUIRED — push notifications)
The bot runs a tiny HTTP server. Web calls this on approve/reject. Same shared secret.
```
POST {BOT_NOTIFY_URL}/notify          { discordId, decision: "approved"|"rejected",
                                        raidId, reason? }  → 200 (bot DMs the member)
```
Web sets `notifiedAt` on the JoinRequest after a successful notify call. If the bot is
unreachable, web still records the decision; a member can re-check via `/myplan`.

---

## Validation invariants (enforce in both apps)
- `discordId` is a non-empty numeric string.
- `dungeon.size ∈ {6,12}`; `raid.slots.length === raid.size`.
- A member appears at most once in a raid's slots.
- A pending JoinRequest is unique per `(raidId, memberId)`.
- Times stored UTC; week boundaries computed in `TEAM_TIMEZONE`.
