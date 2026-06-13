# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/nhan-sinh-nhu-lu/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> This file replaces the generic `--design-system` output (which recommended a light
> "Exaggerated Minimalism" service-landing palette — wrong for this brief). The tokens
> below are curated from the `style`, `color`, `typography`, and `landing` domains for:
> **gaming guild · PVE · wuxia/martial-fantasy (Nghịch Thủy Hàn) · glassmorphism · dark immersive**.

---

**Project:** Nhân Sinh Như Lữ
**Category:** Gaming Guild / Community Landing (dark, glassmorphism, video-hero)

---

## Global Rules

### Color Palette — "Ink, Jade & Gold"

Dark ink background evokes wuxia ink-wash; jade is the guild's signature accent
(growth, vitality, martial discipline); gold marks calls-to-action and highlights
(prestige, reward).

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Background (ink) | `#0A0F0D` | `--color-ink` | Page background, deepest layer |
| Surface (ink-2) | `#111815` | `--color-ink-2` | Section alternation, raised panels |
| Primary (jade) | `#34D399` | `--color-jade` | Links, focus rings, live/status accents |
| Primary deep (jade-deep) | `#0F766E` | `--color-jade-deep` | Gradients, glows, secondary accents |
| CTA/Accent (gold) | `#D4AF37` | `--color-gold` | Primary buttons, badges, highlights |
| Gold soft | `#F2D88F` | `--color-gold-soft` | Hover states, subtle text accents |
| Text (parchment) | `#F5F3EC` | `--color-text` | Headings, primary body text |
| Text muted (mist) | `#A8B3AC` | `--color-text-muted` | Secondary text, captions, labels |

**Color Notes:** Near-black ink base (not pure `#000`) keeps the wuxia/mist mood without
crushing shadow detail. Jade is the primary interactive/accent color; gold is reserved
for CTAs and "featured" emphasis so it stays special. Never use both as competing accents
in the same component.

### Glassmorphism Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--glass-bg` | `rgba(245, 243, 236, 0.05)` | Card/panel fill |
| `--glass-bg-hover` | `rgba(245, 243, 236, 0.09)` | Card/panel fill on hover |
| `--glass-border` | `rgba(245, 243, 236, 0.10)` | 1px borders on glass surfaces |
| `--glass-border-hover` | `rgba(52, 211, 153, 0.35)` | Border on hover (jade glow) |
| `--glass-blur` | `16px` | `backdrop-filter: blur(...)` |
| `--glass-blur-nav` | `12px` | Navbar blur (lighter, perf) |

### Typography

- **Heading Font:** Playfair Display — elegant high-contrast serif, reads as "wuxia/editorial"
  without resorting to faux-Asian display fonts. Full Vietnamese diacritic support.
- **Body Font:** Inter — clean, highly legible at small sizes, full Vietnamese diacritic support.
- **Mood:** immersive, editorial, martial-fantasy, premium guild.
- **Google Fonts:** [Playfair Display + Inter](https://fonts.google.com/share?selection.family=Inter:wght@400;500;600;700|Playfair+Display:wght@500;600;700;800)

**Next.js font loading (use `next/font/google`, not a CSS `@import`):**
```ts
import { Inter, Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
});
```

**Tailwind usage:** `font-display` (headings, `tracking-tight`), `font-body` (default body,
already wired as the global sans font).

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Card padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `96px` / `6rem` | Section vertical padding (landing) |

### Shadow / Glow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle lift |
| `--shadow-md` | `0 8px 24px rgba(0,0,0,0.35)` | Cards at rest |
| `--shadow-lg` | `0 16px 40px rgba(0,0,0,0.45)` | Cards on hover (with lift) |
| `--glow-jade` | `0 0 24px rgba(52,211,153,0.25)` | Hover glow on interactive glass cards |
| `--glow-gold` | `0 0 24px rgba(212,175,55,0.30)` | Hover glow on primary CTAs |

---

## Component Specs

### Buttons

```css
/* Primary (gold) */
.btn-primary {
  background: #D4AF37;
  color: #0A0F0D;
  padding: 12px 28px;
  border-radius: 999px; /* pill */
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-primary:hover {
  background: #F2D88F;
  box-shadow: var(--glow-gold);
  transform: translateY(-1px);
}

/* Secondary (glass) */
.btn-secondary {
  background: var(--glass-bg);
  color: #F5F3EC;
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  padding: 12px 28px;
  border-radius: 999px;
  font-weight: 500;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-secondary:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
}
```

### Glass Cards

```css
.card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
}
.card:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  box-shadow: var(--shadow-lg), var(--glow-jade);
  transform: translateY(-3px);
}
```

### Avatars (Member Cards)

```css
.avatar-ring {
  border-radius: 9999px;
  ring: 2px solid var(--glass-border);
  transition: all 200ms ease;
}
.avatar-ring:hover, .card:hover .avatar-ring {
  ring-color: #34D399;
}
```

---

## Style Guidelines

**Base style:** Glassmorphism (frosted cards/nav, `backdrop-filter: blur(10-20px)`,
translucent `rgba(245,243,236, 0.04-0.10)` fills, 1px translucent borders) layered over
**Dark Mode (OLED-leaning)** — near-black ink background, high-contrast parchment text.

**Hero pattern:** Video-First Hero — full-viewport video background (YouTube, lazy-loaded),
~60% dark gradient overlay for legibility, content centered/overlaid, white/parchment text.

**Section order (locked, see `03-landing.md`):** Hero → Team Intro → Upcoming Raids
(nearest per size) → Footer.

---

## Anti-Patterns (Do NOT Use)

- ❌ Emojis as icons — use Lucide SVG icons only.
- ❌ Missing `cursor-pointer` on clickable elements.
- ❌ Layout-shifting hovers (no `scale()` that reflows; use `translateY` + shadow/glow).
- ❌ Low contrast text — parchment (`#F5F3EC`) on ink (`#0A0F0D`) ≈ 16:1, mist
  (`#A8B3AC`) on ink ≈ 7.8:1; keep both ≥ 4.5:1 even over the video overlay.
- ❌ Instant state changes — always 150-300ms transitions.
- ❌ Invisible focus states — visible jade focus ring (`outline: 2px solid #34D399`).
- ❌ Competing accent colors — gold is CTA-only; jade is the default accent.
- ❌ Autoplay video with sound, or blocking LCP on the iframe.

---

## Pre-Delivery Checklist

- [ ] No emojis used as icons (Lucide only).
- [ ] `cursor-pointer` on all clickable elements.
- [ ] Hover states with smooth transitions (150-300ms), lift + glow on glass cards.
- [ ] Text contrast ≥ 4.5:1, including over the hero video overlay.
- [ ] Visible jade focus ring for keyboard navigation.
- [ ] `prefers-reduced-motion` respected (reveal animations + video → poster).
- [ ] Responsive: 375px, 768px, 1024px, 1440px.
- [ ] No content hidden behind the fixed navbar.
- [ ] No horizontal scroll on mobile.
- [ ] Hero video lazy-loaded behind poster; never blocks first paint.
