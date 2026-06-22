# UI Plan — Giải Đấu Cờ 5 Quân (`/admin/tournaments`)

> Companion to `09-co-5-quan-feature.md`. Built with the **ui-ux-pro-max** skill.
>
> **Surfaces:** (1) the **admin dashboard** (light-zinc, data entry) and (2) a **public
> poster page** at `/giai-dau` (rice-paper / ink-mountain / gold-calligraphy theme, modelled
> on the owner's key art — reuses the `/3v3` arena tokens: `arena-paper`, `arena-mist`,
> `arena-gold-text`, `arena-seal`, `MistScene`, `BambooSprig`). The public page is read-only
> and shows the bracket + standings of the most recent non-draft tournament.
>
> **Theme decision (locked):** the tournament tab uses the existing **light-zinc admin
> theme** — identical to Members / Dungeons / Raids / 3v3 admin tables. The poster
> ink/scroll aesthetic stays reserved for a future public page (matches the 3v3 precedent
> in `design-system/.../pages/3v3-arena.md` §"Admin panel"). Jade = winner, amber = badge/
> highlight accents only. No glassmorphism, no rice-paper, no cinnabar in admin.

---

## 1. Design tokens (admin subset, reused from existing tabs)

These are the only tokens this tab needs — pulled verbatim from `ArenaPanel`/`AdminNav`:

| Use | Class |
|-----|-------|
| Page bg / shell | `bg-zinc-50 text-zinc-900` (from `(admin)/layout.tsx`) |
| Card | `rounded-xl border border-zinc-200 bg-white p-5` |
| Sub-card / slot | `rounded-md border border-zinc-200 p-2` |
| Section label | `text-sm font-medium text-zinc-700` |
| Muted / counter | `text-zinc-400` / `text-zinc-500` |
| Input | `rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500` |
| Primary button | `cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60` |
| Ghost/secondary | `cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100` |
| Destructive hover | `hover:bg-red-50 hover:text-red-700` |
| Error text | `text-sm text-red-600` |
| Winner accent | `text-emerald-600` / `ring-emerald-500` / `bg-emerald-50` (jade family) |
| Highlight badge | `text-amber-600` / `bg-amber-50` (gold family — captain/podium only) |
| Status banner (no DB) | `border-amber-200 bg-amber-50 text-amber-800` |

Icons: **Lucide only** (`Crown`, `Trophy`, `Medal`, `Shuffle`, `Check`, `Pencil`, `Trash2`,
`Megaphone`, `AlertTriangle`, `Lock`). No emojis. All clickable elements get `cursor-pointer`.

---

## 1b. Deviations from `09-co-5-quan-feature.md` (intentional, locked)

- **API base path:** spec wrote `/api/tournaments/*`; actual routes are **`/api/admin/tournaments/*`**.
  Reason: `proxy.ts` only session-guards `/admin/:path*` and `/api/admin/:path*` — the spec path
  would be **unauthenticated**. All other admin APIs already live under `/api/admin/*`.
- **Entrants PUT body:** spec wrote `{ names: string[20] }`; implemented as the superset
  `{ entrants: { name, memberId? }[20] }` so a row can link a synced member (avatar/mention)
  in the same call. Member ids are validated server-side.
- **Entrants editing window:** PUT entrants is allowed only while `status === "draft"` (returns
  409 otherwise). After seeding, the roster is read-only; changing it requires **re-seed**
  (`POST …/seed { confirmReset: true }`), which wipes rounds. Avoids entrant↔bracket desync.

## 2. Routes & files

```
web/app/(admin)/admin/tournaments/
  page.tsx                      ← list view (RSC: fetch + render TournamentList)
  [id]/page.tsx                 ← detail view (RSC: fetch one → TournamentDetail)
web/components/admin/tournaments/
  TournamentList.tsx            ← "use client": create form + list cards
  TournamentDetail.tsx          ← "use client": orchestrates the 5 panels below
  EntrantsEditor.tsx            ← 20-row editor + N/20 counter + member typeahead
  BracketBoard.tsx              ← R1 → R2 columns with connectors
  MatchCard.tsx                 ← two names + [A]–[B] score input + ✅ winner
  RoundRobinPanel.tsx           ← final: 10-match list + live StandingsTable
  StandingsTable.tsx            ← name · points · gameWins · rank
  Podium.tsx                    ← 1/2/3 result (only amber/gold flourish in admin)
```
Add `{ href: "/admin/tournaments", label: "Giải Đấu" }` to `NAV_ITEMS` in `AdminNav.tsx`
(between 3v3 Arena and Join Requests). Reuse the existing `MemberPicker` for entrant→member
linking. Follow the `arena/page.tsx` RSC pattern (try DB → `dbError` amber banner fallback).

---

## 3. List view (`/admin/tournaments`)

- **Create form** (top, same card pattern as `ArenaPanel`): `title` (required), `description`
  (optional), `startAt` (`datetime-local`). Submit → `POST /api/tournaments` → `router.refresh()`.
- **List**: tournament cards sorted by `startAt`, each a `Link` to `[id]`. Each row shows:
  - title + `startAt` rendered in `Asia/Ho_Chi_Minh` (reuse `lib/time` formatter).
  - **Status badge** (pill): `draft`(zinc) · `seeded`(blue) · `r1_done`/`r2_done`(amber) ·
    `final`(emerald) · `completed`(emerald-solid). Single map → consistent colors.
  - **Progress**: `entrants N/20` + round progress e.g. `R2 · 3/5 played` (count matches with
    non-null `winnerId`).
- Empty state: `No tournaments yet.` (`text-sm text-zinc-500`).

---

## 4. Detail view (`/admin/tournaments/[id]`)

Vertical stack of panels; each panel is a `rounded-xl border border-zinc-200 bg-white p-5`
card. Panels reveal progressively by `status` (render-gated, not separate pages).

### 4.1 Header strip
Editable `title` (blur-to-save like ArenaPanel name field), `startAt`, status badge, and a
right-aligned action cluster: **Announce** (`Megaphone`), **Delete** (confirm). Status is
display-only here (it advances via API side-effects), but a small dropdown allows manual
`draft↔seeded` correction behind a confirm.

### 4.2 Entrants panel  *(always visible; editable while `draft`/`seeded`)*
- 20 rows in a `grid sm:grid-cols-2` of `rounded-md border p-2` slots, each: `#seed` chip +
  name `input` + optional `MemberPicker` (typeahead, sets `memberId` for avatar/mention).
- Live **`N/20`** counter; rows over/under 20 flagged. Exact-duplicate names → inline amber
  warn (`AlertTriangle`), allowed but noted (per edge cases).
- **Save entrants** (`PUT …/entrants`) — disabled unless exactly 20 non-empty names.
- After `seeded`, panel becomes read-only with a "Re-seed" affordance (see 4.3).

### 4.3 Seed control
- **`Seed Round 1`** button (`Shuffle` icon) — disabled until 20 saved. On click → confirm
  dialog (especially if already seeded: "This wipes all recorded results"), then
  `POST …/seed` → renders the R1 bracket. Seeds 1..20 assigned randomly server-side.

### 4.4 Bracket board  *(visible once `seeded`)*
- 3 columns, `grid md:grid-cols-[1fr_auto_1fr]` → **R1 (10 cards)** | spacer | **R2 (5 cards)**;
  Final is its own panel (4.5), not a bracket column.
- **Connectors:** simple CSS pseudo-element / SVG elbow lines from each R1 pair into its R2
  slot. Keep lightweight; on mobile (`< md`) collapse to stacked sections with "→ R2 slot k"
  text labels instead of drawn lines (avoids horizontal scroll).
- **`MatchCard`** (shared by R1/R2/final):
  - Two stacked rows = side A / side B (name; avatar if `memberId`).
  - Center score input: two `number` inputs `[A] – [B]`, each `w-12`, `min=0 max=2`.
  - On valid BO3 (`2-0/2-1/0-2/1-2`) → `PATCH …/matches/:matchId`, winner row gets
    `bg-emerald-50 ring-1 ring-emerald-500` + `Check` icon; next-round slot auto-fills.
  - Invalid combo (`1-1`, `2-2`, `3-0`) → inline `text-red-600` "BO3: loser ≤ 1", no save.
  - TBD slot (`aId`/`bId` null) → muted "Chờ kết quả" placeholder, input disabled.
  - **Edit guard:** editing a locked-in result that has downstream consequences shows a
    confirm ("Re-deriving R2 will clear N later results") before the cascade `PATCH`.

### 4.5 Round-robin panel  *(visible once `r2_done`)*
- Header "Chung kết — Vòng tròn (5 người)".
- **10 match cards** (reuse `MatchCard`) listed in a `grid sm:grid-cols-2`, labeled by pair.
  (Optional: a 5×5 cross-table view toggle — defer to v1.1; the list is enough.)
- **`StandingsTable`** below, live-updating as scores save: columns
  `# · Name · Trận thắng (points) · Ván thắng (gameWins) · Hạng`. Sort by points desc, then
  gameWins. Tie rows flagged with amber dot until resolved.

### 4.6 Finalize + Podium  *(visible at `final`/`completed`)*
- **`Finalize`** button — enabled only when all 10 final matches recorded. Computes
  placements server-side. If a points tie can't be broken by H2H → game-wins, surface a
  **manual-override prompt** (`AskUserQuestion`-style modal in-UI) to pick the order
  (`AlertTriangle` flag).
- **`Podium`** — the one place admin uses gold/amber: 2nd–1st–3rd stepped layout, `Trophy`
  (1st, amber), `Medal` (2nd zinc / 3rd amber-700). Names + linked avatars.

### 4.7 Announce
- **`Announce`** button (header) → `POST …/announce`. Toast/inline confirm with returned
  `messageId`. Subsequent clicks **edit** the same Discord message (button label becomes
  "Update announcement" once `announceMessageId` set).

---

## 5. State, data flow, a11y

- **Pattern:** RSC pages fetch via Mongoose/DTO and pass `initial*` props to `"use client"`
  panels that mutate via `fetch` + `router.refresh()` — identical to `ArenaPanel`. No client
  data libs.
- **Optimistic-lite:** score inputs save on blur/valid (debounced); show a subtle saving
  state; on 4xx revert + show server `error`.
- **Accessibility:** every input has a `<label htmlFor>`; score inputs labeled
  "<name> games won"; status conveyed by **badge text + color** (never color alone); winner
  conveyed by `Check` icon + text, not just emerald fill; visible focus ring (`focus:ring`);
  confirm dialogs keyboard-operable; touch targets ≥ 44px on the score/seed buttons.
- **Responsive:** test 375 / 768 / 1024 / 1440. Bracket connectors only ≥ `md`; stacked
  labels below. No horizontal scroll on mobile (entrants/bracket reflow to 1 col).
- **Motion:** 150–300ms `transition-colors` on hover/winner reveal; respect
  `prefers-reduced-motion` (no connector draw animation).

---

## 6. Build order (UI slice of `09 §8`)

1. Nav item + `tournaments/page.tsx` (list) + create form + status badge map.
2. `[id]/page.tsx` shell + header strip + EntrantsEditor (PUT) + Seed (confirm).
3. `BracketBoard` + `MatchCard` (R1/R2, validation, auto-advance render, edit-cascade confirm).
4. `RoundRobinPanel` + `StandingsTable` (live recompute) + tie flagging.
5. `Finalize` + manual tie-break modal + `Podium` (amber/gold).
6. Announce button wiring + edit-state label.
7. QA pass against `09 §6/§7` (seed randomness, BO3, auto-advance, cascade, tie-break, edit).

---

## 7. Open UI questions (defer to owner — mirror `09 §9`)

- 5×5 cross-table view for the final, or is the 10-match list enough? (plan: list in v1.)
- Podium is the only gold/amber surface in admin — acceptable, or keep it fully zinc too?
- Should the detail view show a read-only **public-preview** of the announce embed? (out of
  scope v1 unless wanted.)
