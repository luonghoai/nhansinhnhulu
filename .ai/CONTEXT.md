# Project Context — Nhân Sinh Như Lữ (NSNL)

> **Read this first.** This is the single source of truth for what we are building and why.
> Every AI agent working on this repo must read this file before touching code.

---

## 1. What we are building

A 3-part system to introduce and operate a PVE guild/team called **Nhân Sinh Như Lữ** (NSNL)
for the game **Nghịch Thủy Hàn** (Nghịch Thủy Hàn / NTH).

| # | Component | Stack | Hosting | Purpose |
|---|-----------|-------|---------|---------|
| 1 | **Landing Page** | Next.js (App Router) + TypeScript + Tailwind | Vercel | Public-facing team intro + upcoming raid schedule |
| 2 | **Admin Dashboard** | Same Next.js instance (route group `/admin`) | Vercel | Manage members, dungeons, raid teams, approve join requests |
| 3 | **Discord Bot** | Python (discord.py) | **VPS** (systemd / Docker) | Let members view their plan + request to join raids |

**Important:** Landing page and Admin dashboard live in **ONE** Next.js project/Vercel deployment.
The Discord bot is a **SEPARATE** Python service.

Both the Next.js app and the Python bot talk to the **same MongoDB database**.

---

## 2. Glossary (domain language — use these exact terms)

- **Member / Person** — a guild member. Identified primarily by **Discord ID** (snowflake).
  Synced fields from Discord: `discordId`, `discordName`, `discordAvatar`.
  Admin-set fields: `class` (in-game class), `classIcon` (asset key for the class icon).
- **Class** — the in-game class of a character. NTH has a fixed roster of 7 classes (canonical
  list + icon-key mapping in `web/lib/classes.ts` / data-model doc): Cửu Linh, Huyết Hà, Long Ngâm,
  Thần Tương, Thiết Y, Toái Mộng, Tố Vấn. Class icons are **front-end assets** (`.webp` under
  `web/public/assets/classes/`), referenced by a PascalCase asset key (e.g. `CuuLinh`).
- **Dungeon** — master data: a raid instance with a `name`, default `size` (6 or 12), description.
- **Raid** (a.k.a. **Raid Event / Raid Team**) — a scheduled run of a Dungeon on a specific
  date/time, with a roster of participant Members and assigned positions/slots.
- **Raid size** — 6-person or 12-person. A raid has a fixed number of slots equal to its size.
- **Position / Slot** — a spot in a raid roster. May carry a role label (will be refined).
- **Join Request** — a member's request (via Discord bot) to join a specific upcoming Raid.
  Has status: `pending` → `approved` | `rejected`. Approval is done by Admin in the dashboard.
- **This week** — Monday 00:00 to Sunday 23:59 in the team's timezone (default: `Asia/Ho_Chi_Minh`).
- **Nearest raid** — the upcoming raid with the soonest start time that has not yet passed.

---

## 3. Core user journeys

### Public visitor (Landing page)
1. Lands on page → sees hero with team intro + YouTube video background.
2. Sees the **nearest upcoming raid(s)** only — dungeon info, date/time, and the roster
   (each participant shows: Discord name, Discord avatar, class, class icon).
3. Pure read-only. No auth.

### Admin (Dashboard)
1. Logs in (auth — see Open Questions).
2. **Members:** sync a person from Discord by Discord ID → system fetches `discordName` + `avatar`.
   Admin then sets `class` + `classIcon`. Can add / update / delete members.
3. **Dungeons (master data):** create/edit dungeons with name, size (6/12), description.
4. **Raids:** create multiple raids for the current week (mix of 6- and 12-person).
   Assign participants to slots. Set date/time.
5. **Join Requests:** review pending requests from the bot → approve or reject.
   Approve = member is placed into the raid roster (if a slot is free).

### Member (Discord bot)
1. Uses a bot command/interaction to **view their plan** from now → end of week
   (all raids they are rostered in).
2. Uses a bot command to **see the list of upcoming dungeons/raids** and **select one to join**.
3. If the member has not been synced to the web DB yet → bot creates a minimal member record
   (sync `discordId`, `discordName`, `avatar`; class/icon left empty for admin to fill).
4. The selection becomes a **Join Request** (status `pending`) visible to admin.
5. Member gets notified (via bot) when approved/rejected.

---

## 4. Key rules & constraints

- **Identity:** Discord ID is the canonical key for a Member. Never duplicate a member by name.
- **Landing page shows the nearest team(s) only**, not the full week. (Confirm: nearest single
  raid, or nearest of each size? — see Open Questions.)
- **Admin can create many raids per week**; landing filters to nearest.
- **Class & class icon are admin-managed**, never synced from Discord. Admin picks from the
  canonical 7-class list (`web/lib/classes.ts`); selecting a class auto-fills its `classIcon` key.
- **Class icons are front-end assets** (`web/public/assets/classes/<key>.webp`), referenced by a
  stable PascalCase `classIcon` key. Dungeon banners live under `web/public/assets/dungeons/`.
- **Join requires admin approval** — bot never auto-adds a member to a roster.
- **Timezone:** default `Asia/Ho_Chi_Minh`. Store all times in UTC; render in team TZ.
- **One Vercel app** serves both public + admin; the bot is independent but shares the DB.

---

## 5. Tech decisions (proposed — confirm before build)

- **DB:** MongoDB (Atlas recommended for Vercel + bot to share).
- **ODM (Next.js):** Mongoose (or the official MongoDB driver). Default: **Mongoose**.
- **DB (Python bot):** none directly — bot uses the web `/api/bot/*` API (Pattern B).
- **Discord API (Next.js sync):** Discord REST API (Bot token) to fetch user name + avatar by ID.
- **Bot framework:** `discord.py` v2 (slash commands + interactions/buttons/select menus).
- **Styling:** Tailwind CSS; transparency/glassmorphism, hover/click micro-interactions.
- **UI quality bar:** use the **`ui ux pro`** design approach (see skills/ui-ux-pro.md).
- **Auth (admin):** **simple password** → signed httpOnly session cookie (v1, single admin).
- **Integration:** **Pattern B** — bot ↔ web via `/api/bot/*` (shared secret); web pushes
  notifications to the bot's `/notify` endpoint.
- **Hosting:** web on Vercel; bot on a **VPS** (systemd/Docker); MongoDB **Atlas free (M0)**.
- **Landing UI:** built with the **ui-ux-pro-max** skill (see skills/ui-ux-pro.md).

---

## 6. Out of scope (v1)

- Public member self-service editing (members can't edit their own class).
- Payments, donations, shop.
- Multi-guild / multi-team support (single team only).
- Localization framework (UI copy is VN/EN mixed; no i18n system in v1).
- Mobile native apps.

---

## 7. How to use the planning docs

```
.ai/
├── CONTEXT.md            ← you are here (read first)
├── planning/
│   ├── 00-roadmap.md     ← phased build plan + milestones
│   ├── 01-architecture.md← system + data flow diagrams
│   ├── 02-data-model.md  ← MongoDB collections & schemas
│   ├── 03-landing.md     ← landing page spec
│   ├── 04-admin.md       ← admin dashboard spec
│   ├── 05-discord-bot.md ← bot spec (commands + flows)
│   └── 06-api-contract.md← REST/endpoint contract shared by app & bot
├── specs/
│   └── open-questions.md ← decisions still needed from the owner
├── rules/
│   ├── engineering.md    ← coding standards & conventions
│   ├── security.md       ← secrets, auth, data handling
│   └── git-workflow.md   ← branching, commits, PRs
├── skills/
│   ├── nextjs-app.md     ← how to build the Next.js parts
│   ├── discord-bot.md    ← how to build the Python bot
│   └── ui-ux-pro.md      ← UI/UX quality playbook
└── prompts/
    ├── orchestrator.md   ← master prompt to kick off implementation
    ├── frontend-agent.md ← prompt for the landing+admin agent
    └── bot-agent.md      ← prompt for the Discord bot agent
```

**Workflow:** Planning (this phase) → review/confirm Open Questions → implementation agents
pick up `prompts/*` and build against `planning/*` + `rules/*` + `skills/*`.
