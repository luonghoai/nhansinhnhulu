/**
 * Decorative SVGs for the Cờ 5 Quân poster page: a cherry-blossom branch for the
 * top corners and a hanging calligraphy scroll. All aria-hidden, non-interactive.
 * Greys/pinks only; gold + cinnabar live in the overlay text.
 */

/** A cherry-blossom branch; mirror with `flip` for the opposite corner. */
export function BlossomBranch({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="320"
      height="180"
      viewBox="0 0 320 180"
      fill="none"
      className={flip ? "-scale-x-100" : ""}
    >
      {/* Branch */}
      <path
        d="M0 14 C70 26 140 30 210 64 C250 84 286 120 320 150"
        stroke="#8a7a63"
        strokeWidth="4"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M120 26 C150 30 176 44 200 30"
        stroke="#8a7a63"
        strokeWidth="3"
        fill="none"
        opacity="0.6"
      />
      {/* Blossoms */}
      {[
        [40, 18],
        [96, 22],
        [150, 28],
        [188, 30],
        [206, 60],
        [244, 82],
        [280, 116],
      ].map(([cx, cy], i) => (
        <Blossom key={i} cx={cx} cy={cy} scale={i % 2 ? 0.85 : 1} />
      ))}
    </svg>
  );
}

function Blossom({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const r = 7 * scale;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx={0}
          cy={-r}
          rx={r * 0.6}
          ry={r}
          fill="#f6cdd6"
          opacity="0.92"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.42} fill="#e7a9b8" />
      <circle cx={0} cy={0} r={r * 0.18} fill="#c97e92" />
    </g>
  );
}

/** Hanging scroll bearing the guild name in vertical gold calligraphy. */
export function ScrollBanner() {
  return (
    <div aria-hidden="true" className="flex flex-col items-center">
      {/* Top roller */}
      <span className="h-2 w-16 rounded-full bg-gradient-to-b from-[#6b5536] to-[#4a3a23] shadow-sm" />
      <span className="h-1 w-20 rounded-full bg-[#3a2d1b]" />
      {/* Parchment body */}
      <div className="relative my-1 w-14 rounded-sm bg-gradient-to-b from-[#efe4c7] to-[#d9c79c] px-2 py-5 shadow-[0_8px_20px_rgba(80,60,25,0.25)] ring-1 ring-[#b59a63]/50">
        <span
          className="arena-gold-text mx-auto block font-display text-lg font-extrabold leading-tight tracking-tight"
          style={{ writingMode: "vertical-rl" }}
        >
          Nhân Sinh Như Lữ
        </span>
      </div>
      <span className="h-1 w-20 rounded-full bg-[#3a2d1b]" />
      <span className="h-2 w-16 rounded-full bg-gradient-to-b from-[#6b5536] to-[#4a3a23] shadow-sm" />
    </div>
  );
}

/** A small flying swallow, like the poster's rule-list accents. */
export function Swallow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="26" height="18" viewBox="0 0 26 18" className={className}>
      <path
        d="M1 6 C7 8 10 9 13 13 C16 9 19 8 25 6 C19 9 16 11 13 17 C10 11 7 9 1 6 Z"
        fill="#3a3f39"
      />
    </svg>
  );
}
