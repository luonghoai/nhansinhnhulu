import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TournamentDetail } from "@/components/admin/tournaments/TournamentDetail";
import { connectToDatabase } from "@/lib/db";
import { toMemberDTO, toTournamentDTO } from "@/lib/dto";
import { Member } from "@/lib/models/Member";
import { Tournament } from "@/lib/models/Tournament";

type Params = { params: Promise<{ id: string }> };

export default async function AdminTournamentDetailPage({ params }: Params) {
  const { id } = await params;

  await connectToDatabase();
  const doc = await Tournament.findById(id).catch(() => null);
  if (!doc) notFound();

  const memberDocs = await Member.find({ isActive: true }).sort({ discordName: 1 });

  return (
    <div>
      <Link
        href="/admin/tournaments"
        className="mb-4 inline-flex cursor-pointer items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Tất cả giải đấu
      </Link>

      <TournamentDetail
        initialTournament={toTournamentDTO(doc)}
        members={memberDocs.map(toMemberDTO)}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";
