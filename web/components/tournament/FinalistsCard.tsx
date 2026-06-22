import Image from "next/image";
import { Trophy } from "lucide-react";
import type { StandingDTO } from "@/lib/dto";
import type { Resolved } from "./PublicMatchPlate";

interface FinalistsCardProps {
  standings: StandingDTO[] | null;
  resolve: (entrantId: string | null) => Resolved;
}

const RANK_RING: Record<number, string> = {
  1: "ring-gold",
  2: "ring-[#9aa099]",
  3: "ring-[#a8763a]",
};

export function FinalistsCard({ standings, resolve }: FinalistsCardProps) {
  if (!standings || standings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#d8d2c2] p-5 text-center text-sm italic text-[#9aa099]">
        Chờ vòng chung kết
      </div>
    );
  }

  const ranked = [...standings].sort(
    (a, b) =>
      (a.rank ?? 99) - (b.rank ?? 99) ||
      b.points - a.points ||
      b.gameWins - a.gameWins
  );

  return (
    <ol className="flex flex-col gap-2">
      {ranked.map((s, i) => {
        const r = resolve(s.entrantId);
        const place = s.rank ?? i + 1;
        const top3 = place <= 3;
        return (
          <li
            key={s.entrantId}
            className={`relative flex items-center gap-3 overflow-hidden rounded-lg border border-[#d8d2c2] bg-[#faf8f1]/85 px-3 py-2 shadow-[0_6px_18px_rgba(80,70,40,0.10)] ${
              place === 1 ? "ring-1 ring-gold/60" : ""
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                top3 ? "arena-gold-text" : "text-[#9aa099]"
              }`}
            >
              {top3 ? <Trophy className="h-4 w-4 text-[#b9931f]" aria-hidden="true" /> : place}
            </span>
            {r.avatar ? (
              <Image
                src={r.avatar}
                alt=""
                width={26}
                height={26}
                className={`h-[26px] w-[26px] shrink-0 rounded-full ring-2 ${RANK_RING[place] ?? "ring-[#d8d2c2]"}`}
                unoptimized
              />
            ) : (
              <span
                className={`h-[26px] w-[26px] shrink-0 rounded-full bg-[#e7e1d2] ring-2 ${RANK_RING[place] ?? "ring-[#d8d2c2]"}`}
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#2a2e2b]">
              {top3 && <span className="mr-1 text-xs text-[#9aa099]">#{place}</span>}
              {r.name}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-[#8f6e1c]">
              {s.points}đ
            </span>
          </li>
        );
      })}
    </ol>
  );
}
