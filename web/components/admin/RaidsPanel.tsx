"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { DungeonDTO, MemberDTO, RaidDTO } from "@/lib/dto";
import { formatInTeamTimezone } from "@/lib/time";
import { MemberPicker } from "./MemberPicker";

interface RaidsPanelProps {
  initialRaids: RaidDTO[];
  dungeons: DungeonDTO[];
  members: MemberDTO[];
}

export function RaidsPanel({ initialRaids, dungeons, members }: RaidsPanelProps) {
  const router = useRouter();
  const [dungeonId, setDungeonId] = useState(dungeons[0]?.id ?? "");
  const [startAt, setStartAt] = useState("");
  const [title, setTitle] = useState("");
  // Roster chosen at creation time, keyed by slot index → memberId.
  const [roster, setRoster] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const memberById = new Map(members.map((m) => [m.id, m]));
  const dungeonById = new Map(dungeons.map((d) => [d.id, d]));

  const selectedSize = dungeonById.get(dungeonId)?.size ?? 0;
  // Members already placed in the create-form roster — disabled in every other slot picker.
  const rosteredMemberIds = new Set(Object.values(roster));

  function setRosterSlot(index: number, memberId: string) {
    setRoster((prev) => {
      const next = { ...prev };
      if (memberId) next[index] = memberId;
      else delete next[index];
      return next;
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const slots = Object.entries(roster).map(([index, memberId]) => ({
      index: Number(index),
      memberId,
    }));

    const res = await fetch("/api/admin/raids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dungeonId,
        startAt: new Date(startAt).toISOString(),
        title: title || null,
        slots: slots.length > 0 ? slots : undefined,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to create raid");
      return;
    }

    setTitle("");
    setStartAt("");
    setRoster({});
    router.refresh();
  }

  async function updateSlot(raid: RaidDTO, slotIndex: number, memberId: string | null) {
    const slots = raid.slots.map((slot) =>
      slot.index === slotIndex ? { ...slot, memberId } : slot
    );
    await fetch(`/api/admin/raids/${raid.id}/slots`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    router.refresh();
  }

  async function updateRoleLabel(raid: RaidDTO, slotIndex: number, roleLabel: string) {
    const slots = raid.slots.map((slot) =>
      slot.index === slotIndex ? { ...slot, roleLabel: roleLabel || null } : slot
    );
    await fetch(`/api/admin/raids/${raid.id}/slots`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    router.refresh();
  }

  async function updateStatus(raid: RaidDTO, status: RaidDTO["status"]) {
    await fetch(`/api/admin/raids/${raid.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function removeRaid(raid: RaidDTO) {
    await fetch(`/api/admin/raids/${raid.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-8 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="dungeon" className="mb-1 block text-sm font-medium text-zinc-700">
            Dungeon
          </label>
          <select
            id="dungeon"
            value={dungeonId}
            onChange={(e) => {
              setDungeonId(e.target.value);
              setRoster({});
            }}
            required
            className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {dungeons.map((dungeon) => (
              <option key={dungeon.id} value={dungeon.id}>
                {dungeon.name} ({dungeon.size}-man)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="startAt" className="mb-1 block text-sm font-medium text-zinc-700">
            Start time
          </label>
          <input
            id="startAt"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700">
            Title (optional)
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        {selectedSize > 0 && (
          <div className="w-full">
            <p className="mb-2 text-sm font-medium text-zinc-700">
              Roster{" "}
              <span className="font-normal text-zinc-400">
                (optional · {Object.keys(roster).length}/{selectedSize} filled · leave open as needed)
              </span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: selectedSize }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border border-zinc-200 p-2"
                >
                  <span className="w-6 text-xs text-zinc-400">{index + 1}</span>
                  <MemberPicker
                    members={members}
                    value={roster[index] ?? null}
                    onChange={(memberId) => setRosterSlot(index, memberId ?? "")}
                    disabledIds={rosteredMemberIds}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || dungeons.length === 0}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create raid"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {dungeons.length === 0 && (
        <p className="mb-4 text-sm text-zinc-500">Create a dungeon first to schedule raids.</p>
      )}

      {initialRaids.length === 0 ? (
        <p className="text-sm text-zinc-500">No raids scheduled yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {initialRaids.map((raid) => {
            const dungeon = dungeonById.get(raid.dungeonId);
            const filled = raid.slots.filter((s) => s.memberId).length;
            // Members already placed in this raid — disabled in this raid's other slot pickers.
            const assignedInRaid = new Set(
              raid.slots.map((s) => s.memberId).filter((id): id is string => Boolean(id))
            );
            return (
              <div key={raid.id} className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {raid.title || dungeon?.name || "Unknown dungeon"}{" "}
                      <span className="text-xs text-zinc-400">
                        {dungeon?.name} · {raid.size}-man · {filled}/{raid.size}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatInTeamTimezone(new Date(raid.startAt), "EEE dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={raid.status}
                      onChange={(e) => updateStatus(raid, e.target.value as RaidDTO["status"])}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeRaid(raid)}
                      className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {raid.slots.map((slot) => (
                    <div
                      key={slot.index}
                      className="flex items-center gap-2 rounded-md border border-zinc-200 p-2"
                    >
                      <MemberPicker
                        members={members}
                        value={slot.memberId ?? null}
                        onChange={(memberId) => updateSlot(raid, slot.index, memberId)}
                        disabledIds={assignedInRaid}
                      />
                      <input
                        defaultValue={slot.roleLabel ?? ""}
                        placeholder="role"
                        onBlur={(e) => updateRoleLabel(raid, slot.index, e.target.value)}
                        className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
                {raid.slots.some(
                  (slot) => slot.memberId && !memberById.has(slot.memberId)
                ) && (
                  <p className="mt-2 text-xs text-amber-700">
                    Some slots reference members no longer in the directory.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
