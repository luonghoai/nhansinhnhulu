import { BambooSprig, MistScene } from "./MistScene";

/**
 * Poster-style hero for the 3v3 page, modelled on the "Đại Hội Tỉ Võ" key art:
 * a misty sumi-e mountain scene, a cinnabar event seal, a gold brush-calligraphy
 * title, and a red honour-ribbon subtitle flanked by diamonds.
 */
export function ArenaHero() {
  return (
    <header className="relative isolate overflow-hidden">
      {/* Misty scene + fog (decorative). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <MistScene />
        <div className="absolute inset-0 arena-mist motion-safe:mist-drift" />
        {/* Top vignette keeps the (light-text) navbar legible over the pale sky. */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/25 to-transparent" />
      </div>

      {/* Hanging bamboo at the upper corners. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-2 left-2 opacity-90 sm:left-8">
        <BambooSprig />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -top-2 right-2 opacity-90 sm:right-8">
        <BambooSprig flip />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-16 pt-32 text-center sm:pt-40">
        {/* Cinnabar event seal */}
        <p className="arena-seal mb-7 rounded-md px-5 py-1.5 text-sm font-semibold uppercase tracking-[0.25em]">
          Đại Hội Tỉ Võ
        </p>

        {/* Gold brush-calligraphy title */}
        <h1 className="arena-gold-text font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
          Đấu Trường 3v3
        </h1>

        {/* Red honour ribbon */}
        <div className="mt-7 flex w-full max-w-xl items-center gap-3 text-[#9e2b25]">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#9e2b25]/50" />
          <Diamond />
          <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.22em] sm:text-sm">
            Vinh Danh Anh Hùng · Thiên Hạ Đệ Nhất
          </p>
          <Diamond />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#9e2b25]/50" />
        </div>

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#4a4f49] sm:text-base">
          Ba kiếm khách, một trận pháp. Những đội hình 3v3 tinh nhuệ của Nhân Sinh Như Lữ —
          tôi luyện qua từng trận loạn đấu, khắc tên lên bảng phong thần.
        </p>
      </div>

      {/* Fade the hero into the paper section below. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#e1e5de]"
      />
    </header>
  );
}

function Diamond() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
      <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="#9e2b25" />
    </svg>
  );
}
