# Page Override — `/3v3` (Đấu Trường 3v3 / "Đại Hội Tỉ Võ")

> Overrides `../MASTER.md` for the public 3v3 page. This is the **one intentionally
> LIGHT surface** in the otherwise dark site — modelled on the official "Đại Hội Tỉ Võ"
> key art (misty sumi-e mountains, gold brush-calligraphy title, cinnabar seal accents).
> Everything not stated here still follows the Master rules (motion, focus, spacing).

## Intent

A wuxia **tournament poster** aesthetic: pale rice-paper / fog background, layered ink
mountains, hanging bamboo, a **gold foil** calligraphy title, and **cinnabar-red seals**
for the event badge, honour ribbon, captain tag, and team rank. The mood is ceremonial
("vinh danh anh hùng — thiên hạ đệ nhất"), not the dark-glass mood of the landing page.

## Palette (page-local — overrides Master's dark Ink·Jade·Gold)

| Role | Value | Usage |
|------|-------|-------|
| Paper base | `#fcfbf7 → #e1e5de` (`.arena-paper`) | page background |
| Fog | white bands (`.arena-mist`, `mist-drift`) | over the mountains |
| Ink text | `#2a2e2b` | headings / names |
| Ink muted | `#5c625c` / `#6b6f68` | captions, taglines |
| Gold foil | `#a9781a → #e7c75f → #8f6e1c` (`.arena-gold-text`) | hero title, frames, captain ring |
| Cinnabar seal | `#a83028 → #8f231d` (`.arena-seal`) | event badge, ribbon, rank pill, losses, captain tag |
| Jade (kept) | `--color-jade` / `--color-jade-deep` | win-rate bar, wins, class shield |

## Key pieces

- **`ArenaHero`** — `MistScene` (SVG ink mountains + pagoda + birds) + drifting fog +
  bamboo sprigs; overlay = cinnabar **event seal**, gold **title**, red **honour ribbon**
  with diamonds. A top `from-black/25` vignette keeps the light-text shared `Navbar`
  legible over the pale sky; a bottom fade blends into the paper section.
- **`ArenaTeamCard`** — light "scroll" card: parchment glass, gold top-hairline + gold
  corner brackets, red `arena-seal` rank pill, `wins(jade)–losses(red)` record + jade bar.
- **`ArenaFighter`** — parchment fighter tile; **captain (slot 0)** = raised, gold ring +
  red "Đội trưởng" seal + crown; flankers = jade→gold ring. Open slot = "Đang tuyển".

## A11y / deviations from Master

- This page is **light**, by design — the Master "dark immersive" rule does not apply here.
- The hero **gold title is decorative display art** (gold-on-mist is < 4.5:1); legibility is
  carried by a dark drop-shadow + bronze gradient edges. All *informational* text meets
  contrast: cinnabar `#9e2b25` and ink `#2a2e2b`/`#5c625c` on paper are ≥ 4.5:1.
- No `scale()` reflow hovers; 150–300ms transitions; `prefers-reduced-motion` disables
  the `mist-drift` fog. Focus rings inherit the Master jade outline.

## Admin panel (`/admin/arena`)

Unchanged — keeps the existing **light zinc admin theme** for consistency with the other
admin tables (the poster theming is public-facing only).

## Note — feature scope

`.ai/planning/08-3vs3-battle-feature.md` specs a richer **Battle Events** model (participant
pool → random team generation → scoring → Discord announce). The current implementation is
the simpler **fixed `ArenaTeam` rosters** chosen earlier. This poster styling applies to
either; revisit the data model if the pooled-tournament flow is wanted.
