/**
 * Canonical in-game classes for Nghịch Thủy Hàn (NSNL).
 *
 * This is the single source of truth that maps a class's Vietnamese display name
 * to its `classIcon` asset key. Icon keys match the files admins ship under
 * `web/public/assets/classes/` (PascalCase, same convention as dungeon banners),
 * resolved to a URL via `classIconSrc` in `./assets`.
 *
 * `class`/`classIcon` are admin-managed (never synced from Discord — see CLAUDE.md),
 * so admins pick from this list rather than free-typing.
 */

export type NsnlClass = {
  /** In-game class name (Vietnamese), stored on `member.class`. */
  name: string;
  /** Asset key stored on `member.classIcon`, e.g. `"CuuLinh"` → `/assets/classes/CuuLinh.webp`. */
  iconKey: string;
  range?: "long" | "short"; // optional range classification for future use
};

export const NSNL_CLASSES: readonly NsnlClass[] = [
  { name: "Cửu Linh", iconKey: "CuuLinh", range: "long" },
  { name: "Huyết Hà", iconKey: "HuyetHa", range: "short" },
  { name: "Long Ngâm", iconKey: "LongNgam", range: "short" },
  { name: "Thần Tương", iconKey: "ThanTuong", range: "long" },
  { name: "Thiết Y", iconKey: "ThietY", range: "short" },
  { name: "Toái Mộng", iconKey: "ToaiMong", range: "short" },
  { name: "Tố Vấn", iconKey: "ToVan", range: "long" },
];

/**
 * Asset key of the Tố Vấn (healer/support) class — the canonical source of truth
 * used by 3v3 team balancing (exactly one Tố Vấn per team; see
 * `.ai/planning/11-3vs3-balanced-teams.md`). Matched against `member.classIcon`,
 * never the free-text `class` name.
 */
export const TOVAN_ICON_KEY = "ToVan";

/** True when a member's `classIcon` is Tố Vấn. */
export function isTovanIcon(classIcon?: string | null): boolean {
  return classIcon === TOVAN_ICON_KEY;
}

/** Look up the canonical icon key for a class name, or `null` if unknown. */
export function iconKeyForClass(className?: string | null): string | null {
  if (!className) return null;
  const match = NSNL_CLASSES.find((c) => c.name === className);
  return match?.iconKey ?? null;
}

/**
 * Range classification (`"long" | "short"`) for a class icon key, or `null` when
 * the key is missing/unknown. Used by 3v3 team balancing to pair one long-range
 * and one short-range class alongside the Tố Vấn (see `.ai/planning/12-3v3-double-elim.md`).
 * Matched against `member.classIcon`, never the free-text `class` name.
 */
export function rangeForClassIcon(classIcon?: string | null): "long" | "short" | null {
  if (!classIcon) return null;
  const match = NSNL_CLASSES.find((c) => c.iconKey === classIcon);
  return match?.range ?? null;
}
