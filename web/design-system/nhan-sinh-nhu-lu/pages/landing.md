# Page Override — Landing (`/`)

> Overrides `../MASTER.md` for the public landing page only. Admin pages do not use this file.

## Section-by-section

### Navbar
- Transparent + no border at top of page; on scroll (`scrollY > 16`), becomes
  `bg-ink/60` + `backdrop-blur-[var(--glass-blur-nav)]` + `border-b border-[var(--glass-border)]`.
- Brand name in `font-display`, jade focus ring on links, gold underline on active section
  (optional, skip if no scroll-spy in v1).

### Hero
- `HeroVideoBackground`: lazy-loaded YouTube iframe (env-gated by
  `NEXT_PUBLIC_HERO_YOUTUBE_ID`); falls back to the current ink gradient as the poster
  when the env var is unset or `prefers-reduced-motion` is set.
- Overlay: `bg-gradient-to-b from-ink/50 via-ink/70 to-ink` (~60% darkening per the
  Video-First Hero pattern) so text stays ≥ 4.5:1 over either the video or the gradient.
- `h1` in `font-display`, weight 700-800, `tracking-tight`.
- Tagline in `font-body`, `text-text-muted`.
- CTA pill: secondary/glass style (matches current "Xem lịch raid sắp tới"), jade hover glow.
- Add a scroll-cue (small bouncing chevron, Lucide `ChevronDown`) above the fold,
  `motion-safe:animate-bounce`, `aria-hidden`.

### Team Intro
- Wrap in `SectionReveal` (fade + slight translate-y on first intersection).
- Stat chips: glass cards, jade numeral (`text-jade font-display`), mist label.
- Keep placeholder em-dash (`—`) values until real copy/stats are provided
  (open question #16) — do not invent numbers.

### Upcoming Raids
- Wrap section heading + raid list in `SectionReveal`.
- `RaidCard`: glass panel; size badge (`6-man` / `12-man`) in a jade pill;
  countdown numerals in `font-display tabular-nums`.
- `MemberCard`: avatar ring transitions to jade on card hover (group-hover); class name
  in mist; truncate long names.
- `OpenSlotCard`: dashed border using `--glass-border`, Lucide `UserPlus` icon (muted),
  "Open slot" label — must read as *inviting*, not broken.
- Empty state copy stays exactly: "No upcoming raids scheduled — check back soon."
  (do not localize away from the spec wording without owner sign-off).

### Footer
- Glass top border (`border-t border-[var(--glass-border)]`).
- If `NEXT_PUBLIC_DISCORD_INVITE_URL` is set, render a Discord invite link (Lucide
  icon + label) with jade hover; otherwise omit the link entirely (open question #17).

## Reveal-on-scroll contract
- Single shared `SectionReveal` client component (IntersectionObserver, `threshold: 0.15`,
  `rootMargin: "0px 0px -10% 0px"`, fires once via `unobserve`).
- `prefers-reduced-motion: reduce` → render children directly, no transform/opacity transition.
