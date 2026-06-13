import { Users } from "lucide-react";
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

  return (
    <div className="frame-hairline relative rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-card)] backdrop-blur-lg transition-all duration-200 hover:border-[var(--glass-border-hover)] hover:bg-[var(--glass-bg-hover)] hover:shadow-[var(--shadow-card-hover)]">
      <CornerFrame />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-text">
              {raid.title || dungeon.name}
            </h3>
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gold-soft shadow-[var(--glow-gold)]">
              {raid.size}-man
            </span>
          </div>
          <p className="text-sm text-text-muted">{dungeon.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-muted">{formatInTeamTimezone(new Date(raid.startAt))}</p>
          <p className="font-display text-xl font-semibold text-gold">
            <Countdown startAt={raid.startAt} />
          </p>
        </div>
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
  );
}
