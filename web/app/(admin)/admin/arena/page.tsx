import { ArenaPanel } from "@/components/admin/ArenaPanel";
import { connectToDatabase } from "@/lib/db";
import { toArenaTeamDTO, toMemberDTO } from "@/lib/dto";
import { Member } from "@/lib/models/Member";
import { ArenaTeam } from "@/lib/models/ArenaTeam";

export default async function AdminArenaPage() {
  let teams: ReturnType<typeof toArenaTeamDTO>[] = [];
  let members: ReturnType<typeof toMemberDTO>[] = [];
  let dbError: string | null = null;

  try {
    await connectToDatabase();
    const [teamDocs, memberDocs] = await Promise.all([
      ArenaTeam.find().sort({ isActive: -1, sortOrder: 1, createdAt: 1 }),
      Member.find({ isActive: true }).sort({ discordName: 1 }),
    ]);
    teams = teamDocs.map(toArenaTeamDTO);
    members = memberDocs.map(toMemberDTO);
  } catch {
    dbError = "Database not connected — set MONGODB_URI to manage 3v3 teams.";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">3v3 Arena</h1>

      {dbError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      ) : (
        <ArenaPanel initialTeams={teams} members={members} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
