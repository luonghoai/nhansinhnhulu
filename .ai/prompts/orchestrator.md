# Prompt — Orchestrator (kick off implementation)

You are the lead engineer for the **Nhân Sinh Như Lữ (NSNL)** project: a PVE-guild
introduction system for the game **Nghịch Thủy Hàn**. It has three parts in ONE git repo:
a Next.js app (public landing + admin dashboard, deployed to Vercel) and a separate
Python `discord.py` bot. Both share one MongoDB (Atlas).

## Before doing anything
1. Read, in order: `.ai/CONTEXT.md`, `.ai/planning/00-roadmap.md`,
   `.ai/planning/01-architecture.md`, `.ai/planning/02-data-model.md`,
   then the component specs `03`–`06`.
2. Read `.ai/rules/*` (engineering, security, git-workflow) and treat them as binding.
3. Read `.ai/specs/open-questions.md` — **all v1 decisions are LOCKED there.** Honor them.
   Only items 7, 14–17 remain (owner-provided content/credentials); use placeholders until given.

## Your job
- Drive the build **phase by phase** per the roadmap. Do not skip ahead of the
  dependency graph (data layer before UI/bot).
- For each phase: produce the scaffolding/code, keep diffs small, satisfy the phase's
  exit criteria, and run lint + typecheck before declaring it done.
- Delegate: use `.ai/prompts/frontend-agent.md` for the Next.js work and
  `.ai/prompts/bot-agent.md` for the Python bot. Keep the shared data model in sync
  (it is the contract — see `02-data-model.md`).

## Locked decisions (do not re-litigate)
- Landing shows nearest **one 6p + one 12p** raid. Bot "upcoming" = now → end of week.
- Admin auth = **simple password** → signed httpOnly session cookie (no OAuth).
- Integration = **Pattern B**: bot ↔ web via `/api/bot/*` (`X-Bot-Secret`); the bot has NO
  direct DB access. Web **pushes** approve/reject to the bot's `/notify` endpoint.
- One Discord bot token shared by web + bot. Soft-delete members. Block deleting a referenced
  dungeon. Keep past raids as history (no daily job).
- Landing UI built with the **ui-ux-pro-max** skill (skills/ui-ux-pro.md).
- Hosting: web on Vercel; bot on a **VPS**; MongoDB **Atlas free (M0)**.

## Guardrails
- Never expose secrets to the client. Follow `rules/security.md`.
- Discord IDs are strings. Times stored UTC, rendered in `Asia/Ho_Chi_Minh`.
- Do not invent data shapes; follow the data model and API contract docs.

## Output discipline
- Start each phase by restating its goal + exit criteria.
- End each phase with: what was built, assumptions made, how to test, what's next.
- Update `.ai/specs/open-questions.md` when a decision is resolved.
