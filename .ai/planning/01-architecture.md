# 01 — Architecture

## System overview

```
                         ┌──────────────────────────────┐
                         │        Discord (platform)     │
                         │  users, avatars, OAuth, bot   │
                         └───────▲───────────────▲───────┘
                                 │               │
                  Bot gateway +  │               │ REST (fetch user
                  interactions   │               │ name+avatar by ID;
                                 │               │ OAuth for admin login)
                                 │               │
        ┌────────────────────────┴───┐    ┌──────┴───────────────────────────┐
        │   Python Discord Bot       │    │   Next.js app (Vercel)           │
        │  (discord.py + httpx +     │    │   ┌───────────────┐              │
        │                            │    │   │  /  (landing) │ public        │
        │  /myplan  /raids  join     │    │   ├───────────────┤              │
        │                            │    │   │ /admin/*      │ auth-gated    │
        └──────────────┬─────────────┘    │   ├───────────────┤              │
                       │                  │   │ /api/* (route │ shared API    │
                       │                  │   │   handlers)   │              │
                       │                  │   └──────┬────────┘              │
                       │                  └──────────┼───────────────────────┘
                       │                             │
                       │      both read/write        │
                       └──────────────┬──────────────┘
                                      ▼
                          ┌───────────────────────┐
                          │   MongoDB Atlas        │
                          │  members, dungeons,    │
                          │  raids, joinRequests   │
                          └───────────────────────┘
```

## Components

### Next.js app (single Vercel deployment)
- **Route groups:**
  - `(public)/` → landing page `/`.
  - `(admin)/admin/...` → dashboard, gated by a simple-password signed session cookie.
  - `api/` → route handlers used by admin UI and (optionally) by the bot.
- **Server-side data access** via Mongoose models in `web/lib/models`.
- **Discord REST** calls (bot token) live server-side only (sync name/avatar).

### Python Discord bot (separate service)
- `discord.py` v2 with **slash commands** + **components** (select menus, buttons).
- Data access via the web `/api/bot/*` endpoints (Pattern B); no direct Atlas access.
- Bot talks to data ONLY via the web `/api/bot/*` endpoints (Pattern B), not Mongo directly.
- Bot also runs a **tiny HTTP server** (aiohttp/FastAPI) exposing a `/notify` endpoint the web
  app calls on approve/reject. Stateless; safe to restart.

### MongoDB Atlas
- Single source of truth shared by both apps.
- See `02-data-model.md` for collections, schemas, indexes.

## Integration: Pattern B (DECIDED)

**Pattern B — Bot calls the Next.js API (shared secret).**
The **Next.js API is the single source of business logic**. The bot performs ALL reads/writes
through `/api/bot/*` endpoints, authenticated with `X-Bot-Secret`. The bot does NOT touch Mongo
directly. The web app also **pushes** decision notifications to the bot (see below).

- Centralizes validation + invariants in one codebase (no schema drift).
- Trade-off: the web app must be up for the bot to function (acceptable for v1).
- The data model (`02-data-model.md`) still defines the shapes the API returns/accepts.

## Repo layout (monorepo, single git repo)

```
nsnl/
├── .ai/                    ← planning, rules, skills, prompts (this folder)
├── web/                    ← Next.js (landing + admin + api)
│   ├── app/
│   │   ├── (public)/
│   │   ├── (admin)/admin/
│   │   └── api/
│   ├── lib/{models,db,discord,auth}
│   ├── components/
│   ├── public/assets/classes/   ← class icons (provided later)
│   └── ...
├── bot/                    ← Python discord.py bot
│   ├── bot/{commands,db,views}
│   ├── pyproject.toml
│   └── main.py
├── .env.example
└── README.md
```

## Environments
- **Local:** `.env` for web, `.env` for bot, both pointing at a dev Atlas DB.
- **Prod:** Vercel env vars (web), host env vars (bot). Separate prod Atlas DB.

## Data flow: join request (the critical loop)
```
member ──/raids──► bot ──(create JoinRequest: pending)──► Mongo
                                                            │
admin opens dashboard ──reads pending──◄────────────────────┘
admin approves ──► Raid roster updated + JoinRequest=approved ──► Mongo
web POSTs bot notify endpoint ──► bot DMs member; /myplan now shows raid
landing page ──reads nearest raid roster──► shows member
```

> Notifications are **push**: on approve/reject the web app calls the bot's notify endpoint
> (secured by the shared secret), so the member is DM'd immediately.
