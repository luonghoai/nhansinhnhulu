# NSNL — AI Planning Pack

Planning, rules, skills, and agent prompts for the **Nhân Sinh Như Lữ** project
(PVE guild for **Nghịch Thủy Hàn**). This is the *planning* phase output; coding agents
build against it next.

## Read order
1. `CONTEXT.md` — what we're building + glossary (read first).
2. `planning/00-roadmap.md` → `06-api-contract.md` — the build plan & specs.
3. `specs/open-questions.md` — decisions the owner still needs to make (defaults provided).
4. `rules/*` — binding conventions.
5. `skills/*` — how-to playbooks per area.
6. `prompts/*` — drop-in prompts to start each implementation agent.

## How to start implementation
- Give an agent `prompts/orchestrator.md` to drive the whole build, OR
- Give `prompts/frontend-agent.md` and `prompts/bot-agent.md` to two parallel agents
  once the data layer (Phase 1) exists.

## Three components (one repo)
- `web/` — Next.js landing + admin (Vercel).
- `bot/` — Python discord.py bot (VPS; Pattern B via web API).
- Shared **MongoDB Atlas** (the contract is `planning/02-data-model.md`).

## Still needed from the owner
Admin password, YouTube video ID, class list + icon assets, team intro copy
(items 7, 14–17 in `specs/open-questions.md`). All other v1 decisions are LOCKED there.

## Landing design
The landing MUST be built with the **ui-ux-pro-max** skill
(https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). See `skills/ui-ux-pro.md`.
