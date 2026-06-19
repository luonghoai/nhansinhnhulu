# 07 — Raid Announce Notification

When admin creates a raid with at least one member pre-assigned to a slot, the web app
calls the **Discord REST API directly** (using the bot token) to post an announcement
message into a designated guild text channel — mentioning each invited member.

> **No bot HTTP server required.** `DISCORD_BOT_TOKEN` is already held by the web app
> (used for member sync in `/api/admin/members`). This feature reuses that same token
> to post channel messages, eliminating the need for `BOT_NOTIFY_URL` entirely.

---

## Data flow

```
Admin saves raid (POST /api/admin/raids)
  └─► DB write (raid persisted)
  └─► collect non-null slots → resolve discordId per memberId
  └─► if any filled slots exist:
        POST https://discord.com/api/v10/channels/{RAID_ANNOUNCE_CHANNEL_ID}/messages
        Authorization: Bot {DISCORD_BOT_TOKEN}
        Body: { embeds: [...] }
  └─► on success → set raid.announcedAt = now
  └─► on failure → log warning; raid is still saved (non-blocking)
```

Same pattern applies for approve/reject member DMs — see **Approve/Reject DMs** section.

---

## New env vars

```env
# Discord channel (snowflake as string) where raid announcements are posted
RAID_ANNOUNCE_CHANNEL_ID=

# Already exists — reused here, no new var needed
DISCORD_BOT_TOKEN=
```

Add `RAID_ANNOUNCE_CHANNEL_ID` to `.env.example`.

Remove `BOT_NOTIFY_URL` from `.env.example` — no longer needed (see Architecture impact).

---

## Discord REST calls (web → Discord, no intermediate bot server)

### 1. Post channel message — raid created

```
POST https://discord.com/api/v10/channels/{RAID_ANNOUNCE_CHANNEL_ID}/messages
Authorization: Bot {DISCORD_BOT_TOKEN}
Content-Type: application/json
```

Payload:
```jsonc
{
  "embeds": [{
    "title": "{dungeonName}",
    "description": "**Thời gian:** {startAt rendered in Asia/Ho_Chi_Minh}\n\n**Đội hình:**\n- Slot 1 [tank]: <@discordId1>\n- Slot 2 [heal]: <@discordId2>\n…",
    "color": 16750848,          // orange — guild brand colour placeholder
    "footer": { "text": "Raid ID: {raidId}" }
  }]
}
```

`<@discordId>` pings the user in channel. Unset roleLabel → omit the bracket label.

### 2. Send DM on approve/reject (replaces `BOT_NOTIFY_URL/notify`)

Step 1 — open DM channel (idempotent, Discord deduplicates):
```
POST https://discord.com/api/v10/users/@me/channels
Authorization: Bot {DISCORD_BOT_TOKEN}
Body: { "recipient_id": "{discordId}" }
→ returns { id: dmChannelId }
```

Step 2 — send message:
```
POST https://discord.com/api/v10/channels/{dmChannelId}/messages
Authorization: Bot {DISCORD_BOT_TOKEN}
Body: { "content": "..." }
```

DM text examples:
- Approved: `✅ Yêu cầu tham gia raid **{dungeonName}** ({datetime}) của bạn đã được **chấp thuận**!`
- Rejected: `❌ Yêu cầu tham gia raid **{dungeonName}** ({datetime}) của bạn đã bị **từ chối**. {reason}`

---

## Web changes

### `web/lib/discordClient.ts` (new file, replaces botClient concept)

```ts
// Thin wrapper around Discord REST API using the bot token.
// All functions are server-side only — token never reaches the client.

export async function postChannelMessage(channelId: string, payload: object): Promise<void>

export async function openDMChannel(discordId: string): Promise<string>   // returns dmChannelId

export async function postDMMessage(discordId: string, content: string): Promise<void>
  // calls openDMChannel → then postChannelMessage to the DM channel

export async function announceRaid(raid: RaidAnnouncePayload): Promise<void>
  // builds embed → calls postChannelMessage(RAID_ANNOUNCE_CHANNEL_ID, ...)

export async function notifyDecision(payload: DecisionNotifyPayload): Promise<void>
  // builds DM text → calls postDMMessage(discordId, ...)
```

### DTOs

```ts
type RaidAnnouncePayload = {
  raidId: string;
  dungeonName: string;
  startAt: string;            // ISO UTC — rendered in Asia/Ho_Chi_Minh by this fn
  slots: Array<{
    index: number;
    discordId: string;        // non-null members only
    roleLabel: string | null;
  }>;
};

type DecisionNotifyPayload = {
  discordId: string;
  decision: "approved" | "rejected";
  dungeonName: string;
  startAt: string;            // ISO UTC
  reason?: string | null;     // for rejections
};
```

### `web/app/api/admin/raids/route.ts`

After saving the raid to DB:
1. Populate `dungeonName` from the dungeon document.
2. Collect slots where `memberId != null` → resolve `discordId` from member records.
3. If any filled slots: call `announceRaid(payload)` — fire-and-forget, catch/log only.
4. On success, write `announcedAt = new Date()` to the raid document.

### `web/app/api/admin/requests/[id]/approve/route.ts` and `.../reject/route.ts`

Replace `POST {BOT_NOTIFY_URL}/notify` call with `notifyDecision(payload)`.
Set `notifiedAt` on the JoinRequest after a successful call (same as before).
If Discord API call fails → log, do NOT fail the approve/reject action itself.

---

## Data model change

Add optional `announcedAt` field to the `raids` collection (see `02-data-model.md`):

| Field | Type | Notes |
|-------|------|-------|
| `announcedAt` | Date \| null | UTC timestamp of when the channel announcement was sent. `null` if no filled slots at creation, or if the Discord API call failed. |

---

## Error handling

| Failure scenario | Behaviour |
|---|---|
| `RAID_ANNOUNCE_CHANNEL_ID` not set | Skip announce, log warning |
| Discord API returns non-2xx | Log error with response body; raid still saved |
| Member DM blocked by user | Discord returns 403; log, set `notifiedAt` anyway so admin isn't stuck |
| Bot not in the target channel | Discord returns 403; log warning |
| Network timeout | Log, move on — no retry in v1 |

---

## Architecture impact — removing the bot HTTP server

This design **removes** the `BOT_NOTIFY_URL` integration point:

| Old | New |
|-----|-----|
| Bot runs aiohttp/FastAPI notify server | ❌ Removed |
| `BOT_NOTIFY_URL` env var | ❌ Removed |
| `BOT_NOTIFY_PORT` env var | ❌ Removed |
| Web calls `POST {BOT_NOTIFY_URL}/notify` on approve/reject | Web calls Discord REST directly |
| Web calls `POST {BOT_NOTIFY_URL}/raid-announced` (planned) | Web calls Discord REST directly |

The bot (`bot/`) becomes a **pure Discord interaction handler** — it only handles slash
commands and component interactions. No inbound HTTP server. Simpler to deploy and operate.

Update `01-architecture.md` and `05-discord-bot.md` to reflect this.

---

## Files to create / update

| File | Action |
|------|--------|
| `web/lib/discordClient.ts` | **Create** — Discord REST wrapper |
| `web/app/api/admin/raids/route.ts` | **Update** — call `announceRaid()` after save |
| `web/app/api/admin/requests/[id]/approve/route.ts` | **Update** — use `notifyDecision()` |
| `web/app/api/admin/requests/[id]/reject/route.ts` | **Update** — use `notifyDecision()` |
| `web/lib/botClient.ts` | **Delete** — replaced by `discordClient.ts` |
| `.env.example` | **Update** — add `RAID_ANNOUNCE_CHANNEL_ID`, remove `BOT_NOTIFY_URL`/`BOT_NOTIFY_PORT` |
| `.ai/planning/02-data-model.md` | **Update** — add `announcedAt` to raids table |
| `.ai/planning/05-discord-bot.md` | **Update** — remove notify server section |
| `.ai/planning/06-api-contract.md` | **Update** — remove Web→Bot section, add Discord REST note |
| `.ai/planning/01-architecture.md` | **Update** — remove bot HTTP server from diagram |

---

## Out of scope (v1)

- Re-announcing when the roster is edited after creation.
- "Cancellation" announcement when a raid is cancelled.
- Per-member DM for the initial invite (only channel message; DMs are for approve/reject).
- Rate-limit handling beyond a single try (Discord global rate limit is 50 req/s — v1 traffic is well under this).
