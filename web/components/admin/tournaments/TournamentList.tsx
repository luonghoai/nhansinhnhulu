"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CalendarClock, Plus, Users } from "lucide-react";
import type { TournamentDTO } from "@/lib/dto";
import { formatInTeamTimezone } from "@/lib/time";
import { StatusBadge } from "./StatusBadge";

interface TournamentListProps {
  initialTournaments: TournamentDTO[];
}

export function TournamentList({ initialTournaments }: TournamentListProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        // datetime-local is wall-clock; convert to a UTC ISO instant.
        startAt: new Date(startAt).toISOString(),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to create tournament");
      return;
    }

    const body = await res.json().catch(() => null);
    setTitle("");
    setDescription("");
    setStartAt("");
    if (body?.tournament?.id) {
      router.push(`/admin/tournaments/${body.tournament.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <p className="mb-4 text-sm font-medium text-zinc-700">Tạo giải đấu mới</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="t-title" className="mb-1 block text-sm font-medium text-zinc-700">
              Tên giải đấu
            </label>
            <input
              id="t-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Giải Đấu Cờ 5 Quân Tuần 1"
              className="w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="t-start" className="mb-1 block text-sm font-medium text-zinc-700">
              Thời gian
            </label>
            <input
              id="t-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="t-desc" className="mb-1 block text-sm font-medium text-zinc-700">
              Mô tả (tùy chọn)
            </label>
            <input
              id="t-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {submitting ? "Đang tạo..." : "Tạo giải đấu"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {initialTournaments.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có giải đấu nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {initialTournaments.map((t) => (
            <Link
              key={t.id}
              href={`/admin/tournaments/${t.id}`}
              className="cursor-pointer rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-medium text-zinc-900">{t.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatInTeamTimezone(new Date(t.startAt))}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.entrants.length}/20
                    </span>
                    <span>{roundProgress(t)}</span>
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Short progress label for the active round, e.g. "Vòng 2 · 3/5". */
function roundProgress(t: TournamentDTO): string {
  const played = (ms: TournamentDTO["rounds"]["r1"]) =>
    ms.filter((m) => m.winnerId !== null).length;

  switch (t.status) {
    case "draft":
      return "Chưa bốc thăm";
    case "seeded":
    case "r1_done":
      return `Vòng 1 · ${played(t.rounds.r1)}/${t.rounds.r1.length || 10}`;
    case "r2_done":
      return `Vòng 2 · ${played(t.rounds.r2)}/${t.rounds.r2.length || 5}`;
    case "final":
      return `Chung kết · ${played(t.rounds.final)}/${t.rounds.final.length || 10}`;
    case "completed":
      return "Đã trao giải";
    default:
      return "";
  }
}
