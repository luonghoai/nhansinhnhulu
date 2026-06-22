"use client";

import { Medal, Trophy } from "lucide-react";
import type { TournamentDTO } from "@/lib/dto";

interface PodiumProps {
  placements: TournamentDTO["placements"];
  nameOf: (entrantId: string | null) => string;
}

export function Podium({ placements, nameOf }: PodiumProps) {
  const steps = [
    {
      rank: 2,
      id: placements.second,
      h: "h-20",
      ring: "ring-zinc-300",
      icon: <Medal className="h-5 w-5 text-zinc-400" aria-hidden="true" />,
      tone: "bg-zinc-100",
    },
    {
      rank: 1,
      id: placements.first,
      h: "h-28",
      ring: "ring-amber-400",
      icon: <Trophy className="h-6 w-6 text-amber-500" aria-hidden="true" />,
      tone: "bg-amber-50",
    },
    {
      rank: 3,
      id: placements.third,
      h: "h-16",
      ring: "ring-amber-700/40",
      icon: <Medal className="h-5 w-5 text-amber-700" aria-hidden="true" />,
      tone: "bg-amber-50/60",
    },
  ];

  return (
    <div className="flex items-end justify-center gap-3">
      {steps.map((s) => (
        <div key={s.rank} className="flex w-28 flex-col items-center">
          {s.icon}
          <p className="mt-1 max-w-full truncate text-center text-sm font-semibold text-zinc-900">
            {nameOf(s.id)}
          </p>
          <div
            className={`mt-2 flex ${s.h} w-full items-start justify-center rounded-t-lg ${s.tone} ring-1 ${s.ring}`}
          >
            <span className="mt-2 text-lg font-bold tabular-nums text-zinc-500">{s.rank}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
