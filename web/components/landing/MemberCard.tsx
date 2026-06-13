import { Shield, UserPlus } from "lucide-react";
import Image from "next/image";
import type { MemberDTO } from "@/lib/dto";

export function MemberCard({ member }: { member: MemberDTO }) {
  return (
    <div className="group relative rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 text-center backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-[var(--glass-border-hover)] hover:bg-[var(--glass-bg-hover)] hover:shadow-[var(--glow-jade)]">
      {/* Jade→gold gradient ring; an inset ink disc holds the avatar. */}
      <div className="relative mx-auto mb-2 h-12 w-12 rounded-full bg-gradient-to-br from-jade/40 to-gold/40 p-px transition-all duration-200 group-hover:from-jade group-hover:to-gold">
        <div className="relative h-full w-full overflow-hidden rounded-full bg-ink">
          <Image
            src={member.discordAvatar}
            alt={member.discordName}
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
      </div>
      <p className="truncate text-sm font-medium text-text">{member.discordName}</p>
      <p className="flex items-center justify-center gap-1 truncate text-xs text-text-muted">
        <Shield className="h-3 w-3 shrink-0 text-jade/70" aria-hidden="true" />
        {member.class ?? "Unassigned"}
      </p>
    </div>
  );
}

export function OpenSlotCard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-jade/25 bg-[var(--glass-bg)]/50 p-3 text-center transition-all duration-200 hover:border-jade/50 hover:bg-[var(--glass-bg-hover)]">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-jade/30 text-jade/60">
        <UserPlus className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm text-text-muted">Open slot</p>
    </div>
  );
}
