import { classIconSrc } from "@/lib/assets";
import type { MemberDTO, TournamentDTO } from "@/lib/dto";
import { FinalistsCard } from "./FinalistsCard";
import { PublicMatchPlate, type Resolved } from "./PublicMatchPlate";

interface PublicBracketProps {
  tournament: TournamentDTO;
  members: Record<string, MemberDTO>;
}

export function PublicBracket({ tournament, members }: PublicBracketProps) {
  const entrantById = new Map(tournament.entrants.map((e) => [e.entrantId, e]));

  const resolve = (entrantId: string | null): Resolved => {
    if (!entrantId) return { name: "—", avatar: null };
    const e = entrantById.get(entrantId);
    if (!e) return { name: "—", avatar: null };
    const member = e.memberId ? members[e.memberId] : null;
    const avatar = member
      ? member.discordAvatar || classIconSrc(member.classIcon)
      : null;
    return { name: e.name, avatar: avatar ?? null };
  };

  const r1 = [...tournament.rounds.r1].sort((a, b) => a.slot - b.slot);
  const r2 = [...tournament.rounds.r2].sort((a, b) => a.slot - b.slot);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
      <BracketColumn title="Vòng 1" subtitle="20 → 10">
        <div className="flex flex-col gap-2">
          {r1.map((m) => (
            <PublicMatchPlate key={m.matchId} match={m} resolve={resolve} />
          ))}
        </div>
      </BracketColumn>

      <BracketColumn title="Vòng 2" subtitle="10 → 5">
        {r2.length === 0 ? (
          <Pending />
        ) : (
          <div className="flex h-full flex-col justify-around gap-2">
            {r2.map((m) => (
              <PublicMatchPlate key={m.matchId} match={m} resolve={resolve} />
            ))}
          </div>
        )}
      </BracketColumn>

      <BracketColumn title="Chung Kết" subtitle="5 → 1·2·3">
        <FinalistsCard standings={tournament.standings} resolve={resolve} />
      </BracketColumn>
    </div>
  );
}

function BracketColumn({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-col items-center gap-1.5">
        <span className="arena-seal rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
          {title}
        </span>
        <span className="text-[11px] tracking-wide text-[#9aa099]">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function Pending() {
  return (
    <div className="rounded-lg border border-dashed border-[#d8d2c2] p-5 text-center text-sm italic text-[#9aa099]">
      Chờ kết quả Vòng 1
    </div>
  );
}
