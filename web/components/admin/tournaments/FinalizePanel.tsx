"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import type { TournamentDTO } from "@/lib/dto";

interface FinalizePanelProps {
  tournament: TournamentDTO;
  nameOf: (entrantId: string | null) => string;
}

export function FinalizePanel({ tournament: t, nameOf }: FinalizePanelProps) {
  const router = useRouter();
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Each unresolved tie group, in the admin's chosen order.
  const [tieGroups, setTieGroups] = useState<string[][] | null>(null);

  const final = t.rounds.final;
  const allRecorded = final.length > 0 && final.every((m) => m.winnerId !== null);
  const completed = t.status === "completed";

  async function submit(manualOrder?: string[]) {
    setFinalizing(true);
    setError(null);
    const res = await fetch(`/api/admin/tournaments/${t.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manualOrder ? { manualOrder } : {}),
    });
    setFinalizing(false);

    if (res.status === 409) {
      const body = await res.json().catch(() => null);
      if (body?.error === "needs-manual" && Array.isArray(body.unresolved)) {
        setTieGroups(body.unresolved as string[][]);
        setError(body.message ?? "Cần phân hạng thủ công.");
        return;
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Không trao giải được.");
      return;
    }
    setTieGroups(null);
    router.refresh();
  }

  function move(groupIndex: number, idx: number, dir: -1 | 1) {
    setTieGroups((prev) => {
      if (!prev) return prev;
      const next = prev.map((g) => [...g]);
      const g = next[groupIndex];
      const j = idx + dir;
      if (j < 0 || j >= g.length) return prev;
      [g[idx], g[j]] = [g[j], g[idx]];
      return next;
    });
  }

  if (completed) {
    return (
      <p className="text-sm text-emerald-700">
        Đã trao giải. Sửa bất kỳ tỉ số chung kết nào sẽ cần trao giải lại.
      </p>
    );
  }

  return (
    <div>
      {tieGroups && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-medium text-amber-800">
            Chọn thứ hạng cho nhóm hòa nhau:
          </p>
          {tieGroups.map((group, gi) => (
            <div key={gi} className="mb-2 last:mb-0">
              <ol className="space-y-1">
                {group.map((entrantId, idx) => (
                  <li
                    key={entrantId}
                    className="flex items-center gap-2 rounded-md border border-amber-200 bg-white px-2 py-1 text-sm"
                  >
                    <span className="w-5 text-center tabular-nums text-zinc-400">{idx + 1}</span>
                    <span className="flex-1 truncate text-zinc-900">{nameOf(entrantId)}</span>
                    <button
                      type="button"
                      onClick={() => move(gi, idx, -1)}
                      disabled={idx === 0}
                      aria-label="Lên hạng"
                      className="cursor-pointer rounded p-0.5 text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(gi, idx, 1)}
                      disabled={idx === group.length - 1}
                      aria-label="Xuống hạng"
                      className="cursor-pointer rounded p-0.5 text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <button
            type="button"
            onClick={() => submit(tieGroups.flat())}
            disabled={finalizing}
            className="mt-2 cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            Xác nhận thứ hạng
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => submit()}
          disabled={!allRecorded || finalizing}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trophy className="h-4 w-4" aria-hidden="true" />
          {finalizing ? "Đang trao giải..." : "Trao giải"}
        </button>
        {!allRecorded && (
          <span className="text-xs text-zinc-400">Ghi đủ kết quả chung kết để trao giải.</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
