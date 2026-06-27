import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { Dungeon } from "@/lib/models/Dungeon";
import { Raid } from "@/lib/models/Raid";
import { BattleEvent } from "@/lib/models/BattleEvent";
import { JoinRequest } from "@/lib/models/JoinRequest";

const SECTIONS = [
  { href: "/admin/members", label: "Members", countKey: "members" as const },
  { href: "/admin/dungeons", label: "Dungeons", countKey: "dungeons" as const },
  { href: "/admin/raids", label: "Raids", countKey: "raids" as const },
  { href: "/admin/battles", label: "3v3 Battle", countKey: "battleEvents" as const },
  { href: "/admin/requests", label: "Pending Requests", countKey: "pendingRequests" as const },
];

async function getCounts() {
  await connectToDatabase();
  const [members, dungeons, raids, battleEvents, pendingRequests] = await Promise.all([
    Member.countDocuments({ isActive: true }),
    Dungeon.countDocuments({ isActive: true }),
    Raid.countDocuments({}),
    BattleEvent.countDocuments({}),
    JoinRequest.countDocuments({ status: "pending" }),
  ]);
  return { members, dungeons, raids, battleEvents, pendingRequests };
}

export default async function AdminDashboardPage() {
  let counts: Record<string, number> | null = null;
  let dbError: string | null = null;

  try {
    counts = await getCounts();
  } catch {
    dbError = "Database not connected — set MONGODB_URI to see live data.";
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Dashboard</h1>

      {dbError && (
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dbError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:shadow-sm"
          >
            <p className="text-sm text-zinc-500">{section.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {counts ? counts[section.countKey] : "—"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
