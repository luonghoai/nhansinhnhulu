# 02 — Data Model (MongoDB)

This is the **contract** the `web/` app (Mongoose) owns. The `bot/` consumes these shapes via
the web `/api/bot/*` API (Pattern B), so the API responses must match the DTOs in `06-api-contract.md`.
All timestamps stored in **UTC**. Team timezone for rendering: `Asia/Ho_Chi_Minh`.

---

## Collection: `members`

A guild member. Keyed by Discord ID.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `_id` | ObjectId | auto | |
| `discordId` | string | Discord | **Unique.** Snowflake as string (avoid number precision loss). |
| `discordName` | string | Discord (synced) | display/global name |
| `discordAvatar` | string | Discord (synced) | full CDN URL or avatar hash (store URL for simplicity) |
| `class` | string \| null | Admin | in-game class name (Vietnamese); null until set. Pick from the canonical list, never free-type — see **Canonical classes** below. |
| `classIcon` | string \| null | Admin | asset key (PascalCase), e.g. `"CuuLinh"` → `/assets/classes/CuuLinh.webp`. Auto-derived from `class` via `iconKeyForClass` (`web/lib/classes.ts`). |
| `isActive` | boolean | Admin | default `true`; soft-disable instead of delete if needed |
| `syncedAt` | Date | system | last time name/avatar pulled from Discord |
| `createdAt` / `updatedAt` | Date | system | timestamps |

**Indexes:** `{ discordId: 1 }` unique.

**Canonical classes (Nghịch Thủy Hàn).** `class`/`classIcon` are not free-form — they come
from a fixed list defined in `web/lib/classes.ts` (`NSNL_CLASSES`), the single source of truth
mapping display name → icon key. Admin UI presents these as a `<select>`; choosing a class
auto-fills `classIcon` (`iconKeyForClass`). Icon files live under `web/public/assets/classes/`
as `<iconKey>.webp`.

| `class` (display, VN) | `classIcon` (asset key) |
|-----------------------|-------------------------|
| Cửu Linh | `CuuLinh` |
| Huyết Hà | `HuyetHa` |
| Long Ngâm | `LongNgam` |
| Thần Tương | `ThanTuong` |
| Thiết Y | `ThietY` |
| Toái Mộng | `ToaiMong` |
| Tố Vấn | `ToVan` |

```jsonc
// example
{
  "discordId": "123456789012345678",
  "discordName": "AnHệ",
  "discordAvatar": "https://cdn.discordapp.com/avatars/123.../abc.png",
  "class": "Cửu Linh",
  "classIcon": "CuuLinh",
  "isActive": true,
  "syncedAt": "2026-06-12T03:00:00Z"
}
```

---

## Collection: `dungeons`

Master data describing a raid instance type.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | e.g. "Trích Tiên Kinh Đào" (6-man), "Kính Thiên Các - Cấm Các" (12-man) |
| `size` | number | **6** or **12** (enum). Drives raid slot count. |
| `description` | string | optional |
| `imageKey` | string \| null | optional banner asset key → `/assets/dungeons/<imageKey>`. May carry an explicit extension (e.g. `"TrichTienKinhDao.png"`); a bare key defaults to `.webp`. Resolved via `dungeonBannerSrc` (`web/lib/assets.ts`). |
| `isActive` | boolean | default `true` |
| `createdAt`/`updatedAt` | Date | |

**Indexes:** `{ name: 1 }`.

---

## Collection: `raids`

A scheduled run of a dungeon with a roster. (a.k.a. Raid Event / Raid Team)

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `dungeonId` | ObjectId → dungeons | which dungeon |
| `size` | number | copied from dungeon at creation (6/12) |
| `startAt` | Date (UTC) | raid date+time |
| `title` | string \| null | optional override label |
| `notes` | string \| null | optional |
| `slots` | Slot[] | length === size |
| `status` | string | `scheduled` \| `completed` \| `cancelled` (default `scheduled`) |
| `createdAt`/`updatedAt` | Date | |

**Slot (embedded):**
| Field | Type | Notes |
|-------|------|-------|
| `index` | number | 0..size-1 |
| `roleLabel` | string \| null | optional (e.g. tank/heal/dps) — refine later |
| `memberId` | ObjectId → members \| null | null = open slot |

**Indexes:** `{ startAt: 1 }`, `{ status: 1, startAt: 1 }`.

**Derived queries:**
- *Nearest raid(s):* `status='scheduled' AND startAt >= now` sort `startAt asc` limit N.
- *This week:* `startAt` within Mon..Sun of current week in team TZ.

```jsonc
// example (6-person)
{
  "dungeonId": "…",
  "size": 6,
  "startAt": "2026-06-14T13:00:00Z",
  "slots": [
    { "index": 0, "roleLabel": "tank", "memberId": "…" },
    { "index": 1, "roleLabel": "heal", "memberId": null },
    // …
  ],
  "status": "scheduled"
}
```

---

## Collection: `joinRequests`

A member's request (via bot) to join a raid. Admin approves/rejects.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `raidId` | ObjectId → raids | target raid |
| `memberId` | ObjectId → members | requester |
| `discordId` | string | denormalized for bot convenience |
| `status` | string | `pending` \| `approved` \| `rejected` (default `pending`) |
| `requestedSlotIndex` | number \| null | optional preferred slot |
| `decidedBy` | string \| null | admin Discord ID who decided |
| `decidedAt` | Date \| null | |
| `notifiedAt` | Date \| null | when bot informed the member of the decision |
| `createdAt`/`updatedAt` | Date | |

**Indexes:** `{ status: 1, createdAt: 1 }`, `{ raidId: 1, memberId: 1 }`
(consider partial-unique on `{raidId, memberId}` where status=pending to prevent dupes).

**Lifecycle:**
```
pending ──admin approve──► approved  (+ member placed into a free slot of the raid)
pending ──admin reject───► rejected
```

---

## Referential rules
- Deleting a `member` who is referenced in raid slots → null the slot (don't orphan).
  Prefer `isActive=false` over hard delete.
- Deleting a `dungeon` referenced by raids → block, or cascade per Open Questions.
- `raid.size` must equal `slots.length`.
- **Past raids are kept as history** (no daily job). A raid with `startAt < now` is simply
  "past" on read; `status` stays `scheduled` unless an admin marks it `completed`/`cancelled`.

## Notes on Discord IDs
Store snowflakes as **strings** everywhere. JS numbers lose precision above 2^53.
