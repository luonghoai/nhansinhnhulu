import { formatInTeamTimezone } from "@/lib/time";
import { MistScene } from "@/components/arena/MistScene";
import { BlossomBranch, ScrollBanner } from "./PosterDecor";

interface TournamentHeroProps {
  /** Specific event title + date for the cinnabar seal, if a tournament exists. */
  eventTitle?: string;
  startAt?: string;
}

/**
 * Poster-style hero for the Cờ 5 Quân page, modelled on the provided key art:
 * misty ink mountains, cherry-blossom corners, a hanging calligraphy scroll, and
 * a gold brush-calligraphy title.
 */
export function TournamentHero({ eventTitle, startAt }: TournamentHeroProps) {
  return (
    <header className="relative isolate overflow-hidden">
      {/* Misty scene + fog (decorative). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <MistScene />
        <div className="absolute inset-0 arena-mist motion-safe:mist-drift" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/25 to-transparent" />
      </div>

      {/* Cherry-blossom branches at the upper corners. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-1 left-0 opacity-95">
        <BlossomBranch />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -top-1 right-0 opacity-95">
        <BlossomBranch flip />
      </div>

      {/* Hanging scroll banner (left, large screens). */}
      <div className="pointer-events-none absolute left-6 top-24 hidden xl:block">
        <ScrollBanner />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-14 pt-32 text-center sm:pt-40">
        <h1 className="arena-gold-text font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
          Giải Đấu Cờ 5 Quân
        </h1>

        {(eventTitle || startAt) && (
          <p className="arena-seal mt-7 rounded-md px-5 py-1.5 text-sm font-semibold tracking-wide">
            {eventTitle}
            {eventTitle && startAt && " · "}
            {startAt && formatInTeamTimezone(new Date(startAt), "HH:mm · dd/MM/yyyy")}
          </p>
        )}

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#4a4f49] sm:text-base">
          Cờ 5 quân tranh tài — hai mươi cao thủ, một bàn cờ. Loại trực tiếp qua từng vòng
          rồi quyết đấu vòng tròn, khắc tên người đứng đầu thiên hạ.
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
