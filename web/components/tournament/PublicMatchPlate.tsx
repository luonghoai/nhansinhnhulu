import Image from "next/image";
import type { MatchDTO } from "@/lib/dto";

export type Resolved = { name: string; avatar: string | null };

interface PublicMatchPlateProps {
  match: MatchDTO;
  resolve: (entrantId: string | null) => Resolved;
}

/** A read-only, poster-styled match plate: two names, winner in gold. */
export function PublicMatchPlate({ match, resolve }: PublicMatchPlateProps) {
  const a = resolve(match.aId);
  const b = resolve(match.bId);

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#d8d2c2] bg-[#faf8f1]/85 shadow-[0_6px_18px_rgba(80,70,40,0.10)] backdrop-blur-sm">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
      />
      <PlateSide
        side={a}
        ready={match.aId !== null}
        score={match.scoreA}
        win={match.winnerId !== null && match.winnerId === match.aId}
      />
      <span aria-hidden="true" className="block h-px bg-[#e3ddcd]" />
      <PlateSide
        side={b}
        ready={match.bId !== null}
        score={match.scoreB}
        win={match.winnerId !== null && match.winnerId === match.bId}
      />
    </div>
  );
}

function PlateSide({
  side,
  ready,
  score,
  win,
}: {
  side: Resolved;
  ready: boolean;
  score: number | null;
  win: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 ${win ? "bg-gold/[0.10]" : ""}`}
    >
      {ready && side.avatar ? (
        <Image
          src={side.avatar}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] shrink-0 rounded-full ring-1 ring-[#d8d2c2]"
          unoptimized
        />
      ) : (
        <span className="h-[22px] w-[22px] shrink-0 rounded-full bg-[#e7e1d2]" aria-hidden="true" />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          !ready
            ? "italic text-[#9aa099]"
            : win
              ? "font-semibold text-[#8f6e1c]"
              : "text-[#4a4f49]"
        }`}
      >
        {ready ? side.name : "Chờ kết quả"}
      </span>
      {score !== null && (
        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${
            win ? "text-[#8f6e1c]" : "text-[#9aa099]"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}
