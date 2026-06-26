import { MessagePanel } from "@/components/admin/MessagePanel";
import { connectToDatabase } from "@/lib/db";
import { toMemberDTO } from "@/lib/dto";
import { Member } from "@/lib/models/Member";

export default async function AdminMessagesPage() {
  let members: ReturnType<typeof toMemberDTO>[] = [];
  let dbError: string | null = null;

  try {
    await connectToDatabase();
    const docs = await Member.find({ isActive: { $ne: false } }).sort({ discordName: 1 });
    members = docs.map(toMemberDTO);
  } catch {
    dbError = "Database not connected — set MONGODB_URI to load members for mentions.";
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Message</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Send a message to the Discord channel. Type <span className="font-mono">@</span> to
        mention a member.
      </p>

      {dbError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      ) : (
        <MessagePanel members={members} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
