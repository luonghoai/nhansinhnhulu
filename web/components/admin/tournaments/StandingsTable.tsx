"use client";

import { Trophy } from "lucide-react";
import type { StandingDTO } from "@/lib/dto";

interface StandingsTableProps {
  standings: StandingDTO[];
  nameOf: (entrantId: string | null) => string;
}

export function StandingsTable({ standings, nameOf }: StandingsTableProps) {
  // Rank order: by points desc, then total game wins desc (tie-break #2).
  const sorted = [...standings].sort(
    (a, b) => b.points - a.points || b.gameWins - a.gameWins
  );

  // Flag rows tied on points with a neighbour and not yet rank-resolved.
  const tiedPoints = new Set(
    sorted
      .filter((s, i) => sorted.some((o, j) => j !== i && o.points === s.points))
      .map((s) => s.entrantId)
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
          <th className="px-2 py-2 font-medium">#</th>
          <th className="px-2 py-2 font-medium">Người chơi</th>
          <th className="px-2 py-2 text-center font-medium">Trận thắng</th>
          <th className="px-2 py-2 text-center font-medium">Ván thắng</th>
          <th className="px-2 py-2 text-center font-medium">Hạng</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((s, i) => (
          <tr key={s.entrantId} className="border-b border-zinc-100 last:border-0">
            <td className="px-2 py-2 tabular-nums text-zinc-400">{i + 1}</td>
            <td className="px-2 py-2 font-medium text-zinc-900">
              <span className="inline-flex items-center gap-1.5">
                {nameOf(s.entrantId)}
                {s.rank === null && tiedPoints.has(s.entrantId) && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-400"
                    title="Đang hòa điểm — cần phân hạng"
                    aria-label="Đang hòa điểm"
                  />
                )}
              </span>
            </td>
            <td className="px-2 py-2 text-center tabular-nums font-semibold text-zinc-900">
              {s.points}
            </td>
            <td className="px-2 py-2 text-center tabular-nums text-zinc-600">{s.gameWins}</td>
            <td className="px-2 py-2 text-center">
              {s.rank === null ? (
                <span className="text-zinc-300">—</span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-zinc-900">
                  {s.rank <= 3 && (
                    <Trophy
                      className={
                        s.rank === 1
                          ? "h-3.5 w-3.5 text-amber-500"
                          : s.rank === 2
                            ? "h-3.5 w-3.5 text-zinc-400"
                            : "h-3.5 w-3.5 text-amber-700"
                      }
                      aria-hidden="true"
                    />
                  )}
                  {s.rank}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
