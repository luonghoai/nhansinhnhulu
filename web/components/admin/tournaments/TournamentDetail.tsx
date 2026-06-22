"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shuffle, Trash2 } from "lucide-react";
import type { MemberDTO, TournamentDTO } from "@/lib/dto";
import { BracketBoard } from "./BracketBoard";
import { EntrantsEditor, type EntrantInput } from "./EntrantsEditor";
import { FinalizePanel } from "./FinalizePanel";
import { Podium } from "./Podium";
import { RoundRobinPanel } from "./RoundRobinPanel";
import { StatusBadge } from "./StatusBadge";

interface TournamentDetailProps {
  initialTournament: TournamentDTO;
  members: MemberDTO[];
}

export function TournamentDetail({ initialTournament, members }: TournamentDetailProps) {
  const router = useRouter();
  const t = initialTournament;
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const memberById = new Map(members.map((m) => [m.id, m]));
  const entrantById = new Map(t.entrants.map((e) => [e.entrantId, e]));
  const isDraft = t.status === "draft";

  const nameOf = (entrantId: string | null) =>
    (entrantId && entrantById.get(entrantId)?.name) || "—";

  async function recordMatch(matchId: string, scoreA: number, scoreB: number) {
    const send = (confirmCascade: boolean) =>
      fetch(`/api/admin/tournaments/${t.id}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreA, scoreB, confirmCascade }),
      });

    let res = await send(false);
    if (res.status === 409) {
      const body = await res.json().catch(() => null);
      if (!window.confirm(`${body?.message ?? "Sửa kết quả sẽ ảnh hưởng vòng sau."} Tiếp tục?`)) {
        return;
      }
      res = await send(true);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Không lưu được tỉ số.");
    }
    router.refresh();
  }

  async function patch(payload: Record<string, unknown>) {
    await fetch(`/api/admin/tournaments/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    router.refresh();
  }

  async function saveEntrants(entrants: EntrantInput[]) {
    const res = await fetch(`/api/admin/tournaments/${t.id}/entrants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entrants }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Không lưu được danh sách.");
    }
    router.refresh();
  }

  async function handleSeed() {
    const reseed = !isDraft;
    if (reseed && !window.confirm("Bốc thăm lại sẽ xóa toàn bộ kết quả đã ghi. Tiếp tục?")) {
      return;
    }
    setSeeding(true);
    setSeedError(null);
    const res = await fetch(`/api/admin/tournaments/${t.id}/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmReset: reseed }),
    });
    setSeeding(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSeedError(body?.error ?? "Không bốc thăm được.");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Xóa giải đấu "${t.title}"? Hành động này không thể hoàn tác.`)) {
      return;
    }
    await fetch(`/api/admin/tournaments/${t.id}`, { method: "DELETE" });
    router.push("/admin/tournaments");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header strip */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <label htmlFor="t-title" className="sr-only">
              Tên giải đấu
            </label>
            <input
              id="t-title"
              defaultValue={t.title}
              onBlur={(e) => e.target.value !== t.title && patch({ title: e.target.value })}
              className="w-full max-w-md rounded-md border border-transparent px-1 py-0.5 text-xl font-semibold text-zinc-900 hover:border-zinc-200 focus:border-zinc-300 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label htmlFor="t-start" className="text-xs text-zinc-500">
                Thời gian
              </label>
              <input
                id="t-start"
                type="datetime-local"
                defaultValue={toLocalInput(t.startAt)}
                onBlur={(e) => patch({ startAt: new Date(e.target.value).toISOString() })}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} />
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Xóa
            </button>
          </div>
        </div>
        {t.description && <p className="mt-3 text-sm text-zinc-600">{t.description}</p>}
      </div>

      {/* Entrants panel */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        {isDraft ? (
          <EntrantsEditor
            members={members}
            initial={t.entrants.map((e) => ({ name: e.name, memberId: e.memberId }))}
            onSave={saveEntrants}
          />
        ) : (
          <div>
            <p className="mb-3 text-sm font-medium text-zinc-700">
              Người chơi đã bốc thăm{" "}
              <span className="font-normal text-zinc-400">({t.entrants.length})</span>
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
              {[...t.entrants]
                .sort((a, b) => a.seed - b.seed)
                .map((e) => (
                  <div key={e.entrantId} className="flex items-center gap-2 text-sm">
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-zinc-400">
                      {e.seed}
                    </span>
                    <span className="truncate text-zinc-900">
                      {e.name}
                      {e.memberId && memberById.has(e.memberId) && (
                        <span className="ml-1 text-xs text-emerald-600">●</span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Seed control */}
        <div className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding || t.entrants.length !== 20}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            {seeding
              ? "Đang bốc thăm..."
              : isDraft
                ? "Bốc thăm vòng 1"
                : "Bốc thăm lại"}
          </button>
          {t.entrants.length !== 20 && (
            <span className="text-xs text-zinc-400">Cần đủ 20 người chơi.</span>
          )}
          {seedError && <span className="text-sm text-red-600">{seedError}</span>}
        </div>
      </div>

      {/* Bracket */}
      {!isDraft && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-700">Bảng đấu</h2>
          <BracketBoard tournament={t} nameOf={nameOf} onRecord={recordMatch} />
        </div>
      )}

      {/* Final round-robin */}
      {t.rounds.final.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <RoundRobinPanel
            final={t.rounds.final}
            standings={t.standings}
            nameOf={nameOf}
            onRecord={recordMatch}
          />
        </div>
      )}

      {/* Finalize + podium */}
      {t.rounds.final.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-700">Trao giải</h2>
          {t.status === "completed" && (
            <div className="mb-5">
              <Podium placements={t.placements} nameOf={nameOf} />
            </div>
          )}
          <FinalizePanel tournament={t} nameOf={nameOf} />
        </div>
      )}
    </div>
  );
}

/** ISO UTC instant → "yyyy-MM-ddThh:mm" in the browser's local time for a datetime-local input. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
