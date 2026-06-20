import { Crown, Shield, Swords } from "lucide-react";
import Image from "next/image";
import { classIconSrc } from "@/lib/assets";
import type { MemberDTO } from "@/lib/dto";

interface ArenaFighterProps {
  member: MemberDTO;
  roleLabel?: string | null;
  /** The captain (slot 0) gets a raised, gold-crowned treatment. */
  captain?: boolean;
}

/**
 * A single 3v3 fighter portrait on the light "Đại Hội Tỉ Võ" parchment theme.
 * Captains are raised, gold-ringed and crowned; flankers sit jade-ringed.
 * See design-system/nhan-sinh-nhu-lu/pages/3v3-arena.md.
 */
export function ArenaFighter({ member, roleLabel, captain = false }: ArenaFighterProps) {
  const classIcon = classIconSrc(member.classIcon);

  return (
    <div
      className={`group relative flex flex-col items-center rounded-xl border bg-[#fbfaf4]/80 p-3 text-center backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 ${
        captain
          ? "border-gold/50 hover:border-gold hover:shadow-[0_10px_24px_rgba(180,140,40,0.25)] sm:-mt-4"
          : "border-[#ddd7c8] hover:border-jade/50 hover:shadow-[0_10px_24px_rgba(40,60,50,0.15)]"
      }`}
    >
      {captain && (
        <span
          className="arena-seal absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          title="Đội trưởng"
        >
          <Crown className="h-3 w-3" aria-hidden="true" />
          Đội trưởng
        </span>
      )}

      {/* Portrait: gradient ring (gold for captain, jade→gold otherwise) over an ink disc. */}
      <div
        className={`relative mx-auto mb-2 rounded-full p-px transition-all duration-200 ${
          captain
            ? "mt-1 h-16 w-16 bg-gradient-to-br from-gold to-gold/40 group-hover:from-gold group-hover:to-gold-soft"
            : "h-14 w-14 bg-gradient-to-br from-jade/50 to-gold/50 group-hover:from-jade group-hover:to-gold"
        }`}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full bg-[#2a2e2b]">
          <Image
            src={member.discordAvatar}
            alt={member.discordName}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>

        {classIcon && (
          <span className="absolute -bottom-1 -right-1 h-5 w-5 overflow-hidden rounded-full border border-gold/60 bg-[#faf8f1] shadow-sm">
            <Image
              src={classIcon}
              alt=""
              width={20}
              height={20}
              className="h-full w-full object-cover"
              unoptimized={classIcon.endsWith(".svg")}
            />
          </span>
        )}
      </div>

      <p className="max-w-full truncate text-sm font-semibold text-[#2a2e2b]">
        {member.discordName}
      </p>
      <p className="flex max-w-full items-center justify-center gap-1 truncate text-xs text-[#5c625c]">
        <Shield className="h-3 w-3 shrink-0 text-jade-deep" aria-hidden="true" />
        {member.class ?? "Chưa rõ"}
      </p>
      {roleLabel && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[#9e2b25]/30 bg-[#9e2b25]/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#9e2b25]">
          <Swords className="h-2.5 w-2.5" aria-hidden="true" />
          {roleLabel}
        </span>
      )}
    </div>
  );
}

/** Empty arena slot — a recruiting placeholder that keeps the 3-fighter formation. */
export function ArenaOpenFighter({ captain = false }: { captain?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gold/40 bg-[#faf8f1]/50 p-3 text-center transition-all duration-200 hover:border-gold/70 hover:bg-[#faf8f1]/80 ${
        captain ? "sm:-mt-4" : ""
      }`}
    >
      <div
        className={`mb-2 flex items-center justify-center rounded-full border border-dashed border-gold/50 text-gold ${
          captain ? "h-16 w-16" : "h-14 w-14"
        }`}
      >
        <Swords className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs text-[#5c625c]">Đang tuyển</p>
    </div>
  );
}
