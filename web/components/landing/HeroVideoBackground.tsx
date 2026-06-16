"use client";

import { useEffect, useState } from "react";

const YOUTUBE_ID = process.env.NEXT_PUBLIC_HERO_YOUTUBE_ID ?? "5i6fUY3PYiM";

/**
 * Hero background: ink gradient poster shown immediately; if a YouTube ID is
 * configured, a muted/looped/autoplay iframe is lazy-loaded on top after first
 * paint (skipped under `prefers-reduced-motion` or when no ID is set).
 */
export function HeroVideoBackground() {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!YOUTUBE_ID) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.requestAnimationFrame(() => setShowVideo(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Poster: ink gradient, always present (also the reduced-motion fallback). */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-ink-2 via-ink to-black" />

      {showVideo && YOUTUBE_ID && (
        <iframe
          className="pointer-events-none absolute left-1/2 top-1/2 h-[120vh] w-[120vw] -translate-x-1/2 -translate-y-1/2"
          src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_ID}&controls=0&playsinline=1&modestbranding=1&rel=0`}
          title="Background video"
          aria-hidden="true"
          tabIndex={-1}
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          loading="lazy"
        />
      )}

      {/* ~60% dark overlay for legibility, per the Video-First Hero pattern. */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/70 to-ink" />
    </div>
  );
}
