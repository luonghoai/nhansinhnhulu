import { RequestsPanel, type RequestRow } from "@/components/admin/RequestsPanel";
import { connectToDatabase } from "@/lib/db";
import { Dungeon } from "@/lib/models/Dungeon";
import { JoinRequest } from "@/lib/models/JoinRequest";
import { Member } from "@/lib/models/Member";
import { Raid } from "@/lib/models/Raid";

export default async function AdminRequestsPage() {
  let requests: RequestRow[] = [];
  let dbError: string | null = null;

  try {
    await connectToDatabase();
    const pending = await JoinRequest.find({ status: "pending" }).sort({ createdAt: 1 });

    const raidIds = [...new Set(pending.map((r) => r.raidId.toString()))];
    const memberIds = [...new Set(pending.map((r) => r.memberId.toString()))];

    const [raids, members] = await Promise.all([
      Raid.find({ _id: { $in: raidIds } }),
      Member.find({ _id: { $in: memberIds } }),
    ]);

    const dungeonIds = [...new Set(raids.map((r) => r.dungeonId.toString()))];
    const dungeons = await Dungeon.find({ _id: { $in: dungeonIds } });

    const raidById = new Map(raids.map((r) => [r._id.toString(), r]));
    const memberById = new Map(members.map((m) => [m._id.toString(), m]));
    const dungeonById = new Map(dungeons.map((d) => [d._id.toString(), d]));

    requests = pending.map((r) => {
      const raid = raidById.get(r.raidId.toString());
      const dungeon = raid ? dungeonById.get(raid.dungeonId.toString()) : undefined;
      const member = memberById.get(r.memberId.toString());
      return {
        id: r._id.toString(),
        discordName: member?.discordName ?? r.discordId,
        dungeonName: dungeon?.name ?? "Unknown dungeon",
        raidStartAt: (raid?.startAt ?? r.createdAt!).toISOString(),
        requestedSlotIndex: r.requestedSlotIndex ?? null,
        createdAt: r.createdAt!.toISOString(),
      };
    });
  } catch {
    dbError = "Database not connected — set MONGODB_URI to manage join requests.";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Join Requests</h1>

      {dbError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      ) : (
        <RequestsPanel initialRequests={requests} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
