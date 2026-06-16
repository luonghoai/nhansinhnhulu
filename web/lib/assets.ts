/**
 * Asset-key → public URL resolution.
 *
 * Mirrors the data-model convention (see `.ai/planning/02-data-model.md`): admin-set
 * keys are short slugs that map to files under `web/public/assets/...`, e.g.
 * a dungeon `imageKey` of `"tong-kim"` → `/assets/dungeons/tong-kim.webp`.
 */

/**
 * Resolve a dungeon banner `imageKey` to a renderable `src`, or `null` when unset.
 *
 * - Absolute URLs (`https://…`) and already-rooted paths (`/…`) are used verbatim.
 * - A bare key is treated as an asset slug under `/assets/dungeons/`; if it has no
 *   file extension, `.webp` is assumed.
 */
export function dungeonBannerSrc(imageKey?: string | null): string | null {
  const key = imageKey?.trim();
  if (!key) return null;

  if (/^https?:\/\//i.test(key) || key.startsWith("/")) return key;

  const file = /\.\w+$/.test(key) ? key : `${key}.webp`;
  return `/assets/dungeons/${file}`;
}

/**
 * Resolve a member's class `classIcon` key to a renderable `src`, or `null` when unset.
 *
 * Same resolution rules as {@link dungeonBannerSrc} but rooted at `/assets/classes/`.
 * Bare keys (e.g. `"CuuLinh"` — see `NSNL_CLASSES` in `./classes`) default to `.webp`.
 */
export function classIconSrc(classIcon?: string | null): string | null {
  const key = classIcon?.trim();
  if (!key) return null;

  if (/^https?:\/\//i.test(key) || key.startsWith("/")) return key;

  const file = /\.\w+$/.test(key) ? key : `${key}.webp`;
  return `/assets/classes/${file}`;
}
