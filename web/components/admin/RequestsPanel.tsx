"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatInTeamTimezone } from "@/lib/time";

export interface RequestRow {
  id: string;
  discordName: string;
  dungeonName: string;
  raidStartAt: string;
  requestedSlotIndex: number | null;
  createdAt: string;
}

export function RequestsPanel({ initialRequests }: { initialRequests: RequestRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function approve(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/requests/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to approve request");
      return;
    }
    router.refresh();
  }

  async function reject(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/requests/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to reject request");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {initialRequests.length === 0 ? (
        <p className="text-sm text-zinc-500">No pending join requests.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Requester</th>
                <th className="px-4 py-3 font-medium">Raid</th>
                <th className="px-4 py-3 font-medium">Requested at</th>
                <th className="px-4 py-3 font-medium">Preferred slot</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initialRequests.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.discordName}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {row.dungeonName} · {formatInTeamTimezone(new Date(row.raidStartAt))}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {formatInTeamTimezone(new Date(row.createdAt), "dd/MM HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {row.requestedSlotIndex ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => approve(row.id)}
                        className="cursor-pointer rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => reject(row.id)}
                        className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1 text-xs transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
