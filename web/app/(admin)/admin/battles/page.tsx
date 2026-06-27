import { BattlePanel } from "@/components/admin/BattlePanel";
import { connectToDatabase } from "@/lib/db";
import { toBattleEventDTO, toMemberDTO } from "@/lib/dto";
import { Member } from "@/lib/models/Member";
import { BattleEvent } from "@/lib/models/BattleEvent";

export default async function AdminBattlesPage() {
  let events: ReturnType<typeof toBattleEventDTO>[] = [];
  let members: ReturnType<typeof toMemberDTO>[] = [];
  let dbError: string | null = null;

  try {
    await connectToDatabase();
    const [eventDocs, memberDocs] = await Promise.all([
      BattleEvent.find().sort({ startAt: -1, createdAt: -1 }),
      Member.find({ isActive: true }).sort({ discordName: 1 }),
    ]);
    events = eventDocs.map(toBattleEventDTO);
    members = memberDocs.map(toMemberDTO);
  } catch {
    dbError = "Database not connected — set MONGODB_URI to manage 3v3 battles.";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">3v3 Battle</h1>

      {dbError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      ) : (
        <BattlePanel initialEvents={events} members={members} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
