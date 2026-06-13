# Skill — UI/UX Pro Max (Landing Page Quality Playbook)

> The landing page MUST be built using the **ui-ux-pro-max** AI skill:
> https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
> It is an installable Claude Code skill (90k★) with a design-system generator,
> 67 UI styles (incl. Glassmorphism), 161 color palettes, 57 font pairings, stack-specific
> guidelines, and a pre-delivery anti-pattern checklist. Use it; don't hand-roll the design system.

## 0. Install the skill (do this first, before designing)
The frontend agent installs ui-ux-pro-max into the repo so it auto-activates on UI work:
```
# Option A — CLI (recommended), run at repo root:
npm install -g uipro-cli
uipro init --ai claude          # installs into .claude/skills/ui-ux-pro-max/
# (use the flag matching the coding agent: cursor / windsurf / copilot / codex / etc.)

# Option B — Claude Code marketplace:
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```
Prereq: Python 3.x (the skill's search/design-system engine is Python).

## 1. Generate + PERSIST the design system (single source of truth)
Run the generator for THIS brief and persist it so every page/session reuses it:
```
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "gaming guild PVE wuxia martial-fantasy landing page glassmorphism dark immersive" \
  --design-system --persist -p "Nhan Sinh Nhu Lu" --stack next
```
This writes `design-system/MASTER.md` (colors, typography, spacing, effects, anti-patterns).
- Treat `design-system/MASTER.md` as the **authority** for tokens. The landing must derive every
  color/font/spacing decision from it.
- For the landing specifically, optionally create a page override:
  `... --persist -p "Nhan Sinh Nhu Lu" --page "landing"` → `design-system/pages/landing.md`.
- Before coding a page: read `design-system/MASTER.md`, then `pages/<page>.md` if present
  (page rules override master).

## 2. Brief inputs to feed the generator (subject grounding)
- **Product type:** gaming guild / community landing (PVE team) for an MMO.
- **Subject world:** *Nghịch Thủy Hàn* — wuxia / xianxia martial-fantasy (ink, jade, blade, mist).
- **Desired style:** Glassmorphism + dark immersive (owner asked for transparency effects).
- **Must-have effects (owner):** transparency/glass, hover + click micro-interactions,
  reveal-on-scroll, and a **YouTube video background** in the hero.
- **Stack:** Next.js (App Router) + Tailwind.
Let the engine recommend palette, type pairing, and anti-patterns; follow its output.

## 3. Required effects (owner) — implement on top of the generated system
- **Glassmorphism / transparency:** frosted cards + nav over the video (backdrop-blur,
  translucent fills, 1px translucent borders, soft shadows). Keep text contrast ≥ AA over video.
- **Hover micro-interactions:** card lift + glow, avatar ring, button sheen — 150–300ms eased.
- **Click/press feedback:** scale-down/ripple on press; clear active states.
- **Reveal on scroll:** sections fade/slide in once; respect `prefers-reduced-motion`.

## 4. YouTube video background — do it right
- Hero `<iframe>` (or a lite-embed) muted + looped + autoplay + playsinline, cover the viewport.
- **Poster image** shown immediately; iframe lazy-loads after first paint (don't block LCP).
- Dark gradient overlay above the video for legibility.
- `prefers-reduced-motion` and mobile autoplay-block → show the poster image instead.
- Never autoplay with sound; pause offscreen if feasible.

## 5. Component quality bar
- Roster `MemberCard`: avatar, name, class, class icon — glass card, hover ring/lift.
- Open slots: ghost cards that invite (don't look broken).
- `Countdown`: live, accessible (aria-live polite), localized to team TZ.
- Navbar: transparent at top → solid/blurred after scroll.

## 6. Honor the skill's pre-delivery checklist (gate before "done")
From ui-ux-pro-max — verify ALL before shipping the landing:
- [ ] No emojis as icons — use SVG (Lucide/Heroicons).
- [ ] `cursor-pointer` on all clickable elements.
- [ ] Hover states with smooth transitions (150–300ms).
- [ ] Text contrast ≥ 4.5:1 (over the video overlay too).
- [ ] Visible keyboard focus for nav.
- [ ] `prefers-reduced-motion` respected.
- [ ] Responsive at 375 / 768 / 1024 / 1440.
- [ ] Avoid the industry anti-patterns the generator flags for this brief.
- [ ] Lazy-load media; target Lighthouse ≥ 90 perf & a11y.

## 7. Copy & self-critique
- Write copy as design material: plain, specific, in the guild's voice.
- Real empty/error states ("No upcoming raids scheduled — check back soon."), not mood text.
- Spend boldness in ONE signature element; keep the rest disciplined; remove one decoration
  that doesn't serve the brief. Re-check: does this read as *this guild's* page?

## 8. Admin dashboard styling
- The admin can reuse `design-system/MASTER.md` tokens but should pick a **dashboard-appropriate**
  pattern (data-dense, calm) rather than the immersive landing treatment. Generate a page override
  if useful: `--page "admin"`.
