import { CalendarClock, Swords, Users } from "lucide-react";
import Image from "next/image";
import { dungeonBannerSrc } from "@/lib/assets";
import type { DungeonDTO, MemberDTO, RaidDTO } from "@/lib/dto";
import { formatInTeamTimezone } from "@/lib/time";
import { Countdown } from "./Countdown";
import { MemberCard, OpenSlotCard } from "./MemberCard";
import { CornerFrame } from "./Ornaments";

interface RaidCardProps {
  raid: RaidDTO;
  dungeon: DungeonDTO;
  members: Record<string, MemberDTO>;
}

export function RaidCard({ raid, dungeon, members }: RaidCardProps) {
  const filled = raid.slots.filter((slot) => slot.memberId).length;
  const pct = raid.size > 0 ? Math.round((filled / raid.size) * 100) : 0;
  const banner = dungeonBannerSrc(dungeon.imageKey);
  const title = raid.title || dungeon.name;

  return (
    <article className="frame-hairline group/card relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-[var(--shadow-card)] backdrop-blur-lg transition-all duration-200 hover:border-[var(--glass-border-hover)] hover:bg-[var(--glass-bg-hover)] hover:shadow-[var(--shadow-card-hover)]">
      {/* Banner header — the dungeon's image (admin-set `imageKey`), with a themed
          fallback when none is provided so the card always reads as intentional. */}
      <div className="relative h-40 w-full overflow-hidden sm:h-48">
        {banner ? (
          <Image
            src={banner}
            alt={dungeon.name}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            unoptimized={banner.endsWith(".svg")}
            className="object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-jade-deep/30 via-ink-2 to-ink"
            aria-hidden="true"
          >
            <Swords className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-jade/15" />
          </div>
        )}

        {/* Ink overlay (reuses the hero Video-First darkening pattern) so the title
            stays ≥ 4.5:1 over any banner art. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/15"
          aria-hidden="true"
        />

        <CornerFrame />

        <span className="absolute right-4 top-4 rounded-full border border-gold/40 bg-ink/60 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gold-soft shadow-[var(--glow-gold)] backdrop-blur-sm">
          {raid.size}-man
        </span>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-display text-xl font-semibold text-text [text-shadow:0_2px_8px_rgba(0,0,0,0.6)] sm:text-2xl">
            {title}
          </h3>
          {dungeon.description && (
            <p className="mt-1 truncate text-sm text-text-muted">{dungeon.description}</p>
          )}
        </div>
      </div>

      <div className="p-6 pt-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm text-text-muted">
            <CalendarClock className="h-4 w-4 text-jade" aria-hidden="true" />
            {formatInTeamTimezone(new Date(raid.startAt))}
          </p>
          <p className="font-display text-xl font-semibold text-gold">
            <Countdown startAt={raid.startAt} />
          </p>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-text-muted">
            <Users className="h-3.5 w-3.5 text-jade" aria-hidden="true" />
            Roster ({filled}/{raid.size})
          </p>
          <span
            className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--glass-border)]"
            role="presentation"
          >
            <span
              className="block h-full rounded-full bg-gradient-to-r from-jade-deep to-jade transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {raid.slots.map((slot) =>
            slot.memberId && members[slot.memberId] ? (
              <MemberCard key={slot.index} member={members[slot.memberId]} />
            ) : (
              <OpenSlotCard key={slot.index} />
            )
          )}
        </div>
      </div>
    </article>
  );
}
