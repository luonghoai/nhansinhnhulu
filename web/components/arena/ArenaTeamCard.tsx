import { Swords, Trophy } from "lucide-react";
import type { ArenaTeamDTO, MemberDTO } from "@/lib/dto";
import { ArenaFighter, ArenaOpenFighter } from "./ArenaFighter";

interface ArenaTeamCardProps {
  team: ArenaTeamDTO;
  members: Record<string, MemberDTO>;
}

/** Slot 0 is the captain (centre); 1 and 2 flank left/right in the formation. */
const FORMATION_ORDER: Record<number, string> = { 0: "order-2", 1: "order-1", 2: "order-3" };

export function ArenaTeamCard({ team, members }: ArenaTeamCardProps) {
  const total = team.wins + team.losses;
  const winRate = total > 0 ? Math.round((team.wins / total) * 100) : 0;

  // Always render exactly three positions so the formation never collapses.
  const slots = Array.from({ length: 3 }, (_, index) => {
    return (
      team.slots.find((s) => s.index === index) ?? { index, roleLabel: null, memberId: null }
    );
  });

  return (
    <article className="group/card relative overflow-hidden rounded-2xl border border-[#d8d2c2] bg-[#faf8f1]/85 shadow-[0_10px_30px_rgba(80,70,40,0.12)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_16px_40px_rgba(120,95,30,0.18)]">
      {/* Gold foil hairline along the top edge — frames the "scroll". */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
      />
      {/* Gold corner brackets. */}
      {["left-2 top-2 border-l border-t", "right-2 top-2 border-r border-t", "left-2 bottom-2 border-l border-b", "right-2 bottom-2 border-r border-b"].map(
        (pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={`pointer-events-none absolute h-3 w-3 border-gold/50 ${pos}`}
          />
        )
      )}

      {/* Crossed-blades battle watermark. */}
      <Swords
        className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rotate-12 text-gold/[0.08]"
        aria-hidden="true"
      />

      {/* Banner header */}
      <div className="relative border-b border-[#e3ddcd] bg-gradient-to-b from-gold/[0.07] to-transparent p-6 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold text-[#2a2e2b] sm:text-2xl">
              {team.name}
            </h3>
            {team.tagline && (
              <p className="mt-1 truncate text-sm italic text-[#6b6f68]">{team.tagline}</p>
            )}
          </div>

          {team.rankLabel && (
            <span className="arena-seal flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              {team.rankLabel}
            </span>
          )}
        </div>

        {/* Battle record */}
        <div className="mt-4 flex items-center gap-4">
          <p className="font-display text-lg font-semibold">
            <span className="text-jade-deep">{team.wins}</span>
            <span className="mx-1 text-[#9aa099]">–</span>
            <span className="text-[#9e2b25]">{team.losses}</span>
          </p>
          <div className="flex flex-1 items-center gap-2">
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e0dac9]"
              role="presentation"
            >
              <span
                className="block h-full rounded-full bg-gradient-to-r from-jade-deep to-jade transition-[width] duration-300"
                style={{ width: `${winRate}%` }}
              />
            </span>
            <span className="shrink-0 text-xs tabular-nums text-[#6b6f68]">
              {total > 0 ? `${winRate}% thắng` : "Chưa thi đấu"}
            </span>
          </div>
        </div>
      </div>

      {/* Formation: captain centre, two flankers */}
      <div className="grid grid-cols-3 items-start gap-3 p-6 pt-7">
        {slots.map((slot) => {
          const member = slot.memberId ? members[slot.memberId] : null;
          const captain = slot.index === 0;
          return (
            <div key={slot.index} className={FORMATION_ORDER[slot.index]}>
              {member ? (
                <ArenaFighter member={member} roleLabel={slot.roleLabel} captain={captain} />
              ) : (
                <ArenaOpenFighter captain={captain} />
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
