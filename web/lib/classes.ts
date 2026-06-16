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
};

export const NSNL_CLASSES: readonly NsnlClass[] = [
  { name: "Cửu Linh", iconKey: "CuuLinh" },
  { name: "Huyết Hà", iconKey: "HuyetHa" },
  { name: "Long Ngâm", iconKey: "LongNgam" },
  { name: "Thần Tương", iconKey: "ThanTuong" },
  { name: "Thiết Y", iconKey: "ThietY" },
  { name: "Toái Mộng", iconKey: "ToaiMong" },
  { name: "Tố Vấn", iconKey: "ToVan" },
];

/** Look up the canonical icon key for a class name, or `null` if unknown. */
export function iconKeyForClass(className?: string | null): string | null {
  if (!className) return null;
  const match = NSNL_CLASSES.find((c) => c.name === className);
  return match?.iconKey ?? null;
}
