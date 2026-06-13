import { DungeonsTable } from "@/components/admin/DungeonsTable";
import { connectToDatabase } from "@/lib/db";
import { toDungeonDTO } from "@/lib/dto";
import { Dungeon } from "@/lib/models/Dungeon";

export default async function AdminDungeonsPage() {
  let dungeons: ReturnType<typeof toDungeonDTO>[] = [];
  let dbError: string | null = null;

  try {
    await connectToDatabase();
    const docs = await Dungeon.find().sort({ name: 1 });
    dungeons = docs.map(toDungeonDTO);
  } catch {
    dbError = "Database not connected — set MONGODB_URI to manage dungeons.";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Dungeons</h1>

      {dbError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      ) : (
        <DungeonsTable initialDungeons={dungeons} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
