"use client";

import type { MatchDTO, TournamentDTO } from "@/lib/dto";
import { MatchCard } from "./MatchCard";

interface BracketBoardProps {
  tournament: TournamentDTO;
  nameOf: (entrantId: string | null) => string;
  onRecord: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
}

export function BracketBoard({ tournament, nameOf, onRecord }: BracketBoardProps) {
  const { r1, r2 } = tournament.rounds;
  const bySlot = (ms: MatchDTO[]) => [...ms].sort((x, y) => x.slot - y.slot);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Column title="Vòng 1" subtitle="20 → 10">
        <div className="flex flex-col gap-2">
          {bySlot(r1).map((m) => (
            <MatchCard
              key={m.matchId}
              match={m}
              nameOf={nameOf}
              onRecord={onRecord}
              label={`Trận ${m.slot + 1}`}
            />
          ))}
        </div>
      </Column>

      <Column title="Vòng 2" subtitle="10 → 5">
        {r2.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-400">
            Hoàn tất 10 trận Vòng 1 để mở Vòng 2.
          </p>
        ) : (
          <div className="flex h-full flex-col justify-around gap-2">
            {bySlot(r2).map((m) => (
              <MatchCard
                key={m.matchId}
                match={m}
                nameOf={nameOf}
                onRecord={onRecord}
                label={`Trận ${m.slot + 1}`}
              />
            ))}
          </div>
        )}
      </Column>
    </div>
  );
}

function Column({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <span className="text-xs text-zinc-400">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}
