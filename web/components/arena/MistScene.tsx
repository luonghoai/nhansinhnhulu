/**
 * Decorative sumi-e backdrop for the 3v3 arena hero: layered ink mountains
 * fading into fog, faint pagoda ridge-lines, and a few drifting birds — all
 * SVG, aria-hidden, non-interactive. Greys only; gold/red live in the overlay.
 */
export function MistScene() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMax slice"
    >
      {/* Far range — palest, highest. */}
      <path
        d="M0 470 C150 410 260 440 360 400 C460 360 560 420 680 390 C800 360 920 410 1040 380 C1110 362 1160 390 1200 380 L1200 700 L0 700 Z"
        fill="#cfd4cd"
        opacity="0.5"
      />
      {/* Mid range. */}
      <path
        d="M0 540 C120 500 220 520 320 490 C440 454 520 520 640 500 C770 478 860 524 980 506 C1080 491 1140 520 1200 510 L1200 700 L0 700 Z"
        fill="#b3b9b1"
        opacity="0.6"
      />
      {/* Near range — darkest ink, anchors the bottom. */}
      <path
        d="M0 612 C140 588 240 600 360 580 C500 556 600 606 740 592 C860 580 960 612 1080 600 C1140 594 1180 606 1200 602 L1200 700 L0 700 Z"
        fill="#8f968e"
        opacity="0.7"
      />

      {/* A faint pagoda silhouette perched on the near ridge (right). */}
      <g fill="#7c837b" opacity="0.55">
        <path d="M905 560 l28 -22 28 22 -6 6 h-44 z" />
        <rect x="911" y="566" width="44" height="6" />
        <path d="M915 572 l18 -14 18 14 -5 5 h-26 z" />
        <rect x="924" y="577" width="18" height="20" />
      </g>

      {/* Distant birds. */}
      <g stroke="#6f766e" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5">
        <path d="M250 250 q12 -10 24 0 q12 -10 24 0" />
        <path d="M320 290 q9 -8 18 0 q9 -8 18 0" />
        <path d="M210 300 q7 -6 14 0 q7 -6 14 0" />
      </g>
    </svg>
  );
}

/** A single hanging bamboo sprig (gold-olive), mirrored via `flip`. */
export function BambooSprig({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="120"
      height="200"
      viewBox="0 0 120 200"
      fill="none"
      className={flip ? "-scale-x-100" : ""}
    >
      <path d="M22 0 C30 60 26 130 40 200" stroke="#9aa15f" strokeWidth="3" fill="none" />
      <g fill="#b9a14a" opacity="0.85">
        <path d="M24 36 C44 30 70 36 92 22 C72 44 46 50 26 46 Z" />
        <path d="M26 70 C48 66 76 74 100 62 C78 84 50 88 30 82 Z" />
        <path d="M30 108 C50 104 74 112 96 102 C76 122 50 124 34 118 Z" />
        <path d="M34 150 C52 148 72 156 92 148 C74 166 50 166 38 160 Z" />
      </g>
    </svg>
  );
}
