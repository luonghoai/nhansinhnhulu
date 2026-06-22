import { TournamentList } from "@/components/admin/tournaments/TournamentList";
import { connectToDatabase } from "@/lib/db";
import { toTournamentDTO } from "@/lib/dto";
import { Tournament } from "@/lib/models/Tournament";

export default async function AdminTournamentsPage() {
  let tournaments: ReturnType<typeof toTournamentDTO>[] = [];
  let dbError: string | null = null;

  try {
    await connectToDatabase();
    const docs = await Tournament.find().sort({ startAt: 1 });
    tournaments = docs.map(toTournamentDTO);
  } catch {
    dbError = "Database not connected — set MONGODB_URI to manage tournaments.";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Giải Đấu Cờ 5 Quân</h1>

      {dbError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      ) : (
        <TournamentList initialTournaments={tournaments} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
