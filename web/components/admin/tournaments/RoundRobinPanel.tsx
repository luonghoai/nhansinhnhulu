"use client";

import type { MatchDTO, StandingDTO } from "@/lib/dto";
import { MatchCard } from "./MatchCard";
import { StandingsTable } from "./StandingsTable";

interface RoundRobinPanelProps {
  final: MatchDTO[];
  standings: StandingDTO[] | null;
  nameOf: (entrantId: string | null) => string;
  onRecord: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
}

export function RoundRobinPanel({ final, standings, nameOf, onRecord }: RoundRobinPanelProps) {
  const sorted = [...final].sort((a, b) => a.slot - b.slot);
  const played = sorted.filter((m) => m.winnerId !== null).length;

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">Chung kết — Vòng tròn (5 người)</h3>
        <span className="text-xs text-zinc-400">
          {played}/{sorted.length} trận
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sorted.map((m) => (
          <MatchCard key={m.matchId} match={m} nameOf={nameOf} onRecord={onRecord} />
        ))}
      </div>

      {standings && standings.length > 0 && (
        <div className="mt-6 rounded-lg border border-zinc-200 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Bảng xếp hạng
          </p>
          <StandingsTable standings={standings} nameOf={nameOf} />
        </div>
      )}
    </div>
  );
}
