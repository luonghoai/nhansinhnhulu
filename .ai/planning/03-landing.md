# 03 — Landing Page Spec

Public, read-only, no auth. Built per `skills/ui-ux-pro.md`.

---

## Sections (top → bottom)

### 1. Hero (full viewport)
- **YouTube video background**, muted + looped + autoplay, covering the viewport.
  - Use a privacy-friendly embed; poster image fallback while loading.
  - Dark gradient/overlay on top so text stays legible.
  - Respect `prefers-reduced-motion` → show static poster instead of video.
  - Mobile: many browsers block autoplay → fall back to poster image.
- Team name **Nhân Sinh Như Lữ** + game tag **Nghịch Thủy Hàn**.
- Short tagline + CTA scroll cue.

### 2. Team Introduction
- Paragraph(s) introducing the team's identity, playstyle (PVE), vibe.
- Optional stat chips (member count, dungeons cleared) — static/derived.
- Glassmorphism cards over the darkened hero continuation.

### 3. Upcoming Raid — **nearest only**
- Show the **nearest upcoming raid(s)** (see Open Questions: single vs one-per-size).
- For each shown raid:
  - **Dungeon info:** name, size badge (6/12), optional thumbnail, description.
  - **Date/time:** localized to `Asia/Ho_Chi_Minh`; live **countdown**.
  - **Roster:** grid of participant cards. Each card:
    - Discord avatar (rounded, subtle ring on hover)
    - Discord name
    - Class name
    - Class icon (from `/assets/classes/<classIcon>.png`)
    - Open slots rendered as ghost/placeholder cards.
- Empty state: "No upcoming raids scheduled — check back soon."

### 4. Footer
- Discord invite link (optional), credits, year.

---

## Data needed
- `GET nearest raid(s)` → raid + populated dungeon + populated member slots.
- Server Component fetch (no client secrets). Revalidate periodically (e.g. ISR 60s) or
  dynamic render. Default: dynamic with short cache.

## Visual / interaction requirements (from owner)
- Transparency / glass effects on cards and nav.
- Hover states (lift, glow, avatar ring) and click feedback (press/scale).
- Smooth scroll + reveal-on-scroll animations (respect reduced-motion).
- YouTube video as hero background.

## Performance & a11y targets
- Lighthouse ≥ 90 performance & accessibility.
- Defer/lazy-load the YouTube iframe; never block first paint on it.
- All interactive elements keyboard-focusable; alt text on avatars/icons.
- Color contrast AA over the video overlay.

## Component inventory (suggested)
- `HeroVideoBackground`, `Navbar` (transparent → solid on scroll),
  `TeamIntro`, `RaidCard`, `RosterGrid`, `MemberCard`, `OpenSlotCard`,
  `Countdown`, `SectionReveal`, `Footer`.

## Open dependencies
- YouTube video ID (owner to provide).
- Class icon assets → `web/public/assets/classes/` (owner to provide).
- Team intro copy (owner to provide; placeholder until then).
