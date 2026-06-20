import type { ReactNode } from "react";

/**
 * Wuxia/martial-fantasy decoration helpers (CSS/SVG only) shared by the
 * Team Intro and Raids sections. All purely decorative — aria-hidden and
 * non-interactive. See design-system/nhan-sinh-nhu-lu/MASTER.md.
 */

/**
 * Full-bleed background atmosphere: a faint ink-wash gradient + parchment grain
 * (defined in globals.css). Sits behind section content; never intercepts input.
 */
export function InkWash({ variant }: { variant: "team" | "raids" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-0 ink-wash-${variant}`}
    />
  );
}

/** Small gold lotus/diamond glyph used at the centre of section dividers. */
function DividerGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-gold motion-safe:glow-pulse"
    >
      <path
        d="M11 1l2.6 6.4L20 11l-6.4 2.6L11 20l-2.6-6.4L2 11l6.4-2.6L11 1z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="11" r="1.6" fill="currentColor" />
    </svg>
  );
}

interface SectionHeadingProps {
  kicker: string;
  title: string;
}

/** Kicker + Playfair title + ornamental jade/gold divider. Centered. */
export function SectionHeading({ kicker, title }: SectionHeadingProps) {
  return (
    <div className="text-center">
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold-soft/80">{kicker}</p>
      <h2 className="font-display text-3xl font-semibold text-text sm:text-4xl">{title}</h2>
      <div className="mx-auto mt-5 flex max-w-xs items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-jade/50" />
        <DividerGlyph />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-jade/50" />
      </div>
    </div>
  );
}

/**
 * Overlays four thin jade corner brackets on a positioned (`relative`) card to
 * evoke a framed scroll / war banner. Decorative only.
 */
export function CornerFrame({ children }: { children?: ReactNode }) {
  const corners = [
    "left-0 top-0 border-l border-t",
    "right-0 top-0 border-r border-t",
    "left-0 bottom-0 border-l border-b",
    "right-0 bottom-0 border-r border-b",
  ];
  return (
    <>
      {corners.map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          className={`pointer-events-none absolute h-3 w-3 border-jade/40 ${pos}`}
        />
      ))}
      {children}
    </>
  );
}
