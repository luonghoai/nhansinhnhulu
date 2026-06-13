import { RaidsPanel } from "@/components/admin/RaidsPanel";
import { connectToDatabase } from "@/lib/db";
import { toDungeonDTO, toMemberDTO, toRaidDTO } from "@/lib/dto";
import { Dungeon } from "@/lib/models/Dungeon";
import { Member } from "@/lib/models/Member";
import { Raid } from "@/lib/models/Raid";

export default async function AdminRaidsPage() {
  let raids: ReturnType<typeof toRaidDTO>[] = [];
  let dungeons: ReturnType<typeof toDungeonDTO>[] = [];
  let members: ReturnType<typeof toMemberDTO>[] = [];
  let dbError: string | null = null;

  try {
    await connectToDatabase();
    const [raidDocs, dungeonDocs, memberDocs] = await Promise.all([
      Raid.find().sort({ startAt: 1 }),
      Dungeon.find({ isActive: true }).sort({ name: 1 }),
      Member.find({ isActive: true }).sort({ discordName: 1 }),
    ]);
    raids = raidDocs.map(toRaidDTO);
    dungeons = dungeonDocs.map(toDungeonDTO);
    members = memberDocs.map(toMemberDTO);
  } catch {
    dbError = "Database not connected — set MONGODB_URI to manage raids.";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Raids</h1>

      {dbError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      ) : (
        <RaidsPanel initialRaids={raids} dungeons={dungeons} members={members} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
