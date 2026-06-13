import { MembersTable } from "@/components/admin/MembersTable";
import { connectToDatabase } from "@/lib/db";
import { toMemberDTO } from "@/lib/dto";
import { Member } from "@/lib/models/Member";

export default async function AdminMembersPage() {
  let members: ReturnType<typeof toMemberDTO>[] = [];
  let dbError: string | null = null;

  try {
    await connectToDatabase();
    const docs = await Member.find().sort({ discordName: 1 });
    members = docs.map(toMemberDTO);
  } catch {
    dbError = "Database not connected — set MONGODB_URI to manage members.";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Members</h1>

      {dbError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      ) : (
        <MembersTable initialMembers={members} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
