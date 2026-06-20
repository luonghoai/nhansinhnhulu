"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Crown, Minus, Plus } from "lucide-react";
import type { ArenaTeamDTO, MemberDTO } from "@/lib/dto";
import { MemberPicker } from "./MemberPicker";

interface ArenaPanelProps {
  initialTeams: ArenaTeamDTO[];
  members: MemberDTO[];
}

const SLOT_LABELS = ["Đội trưởng (Captain)", "Cánh trái", "Cánh phải"];

export function ArenaPanel({ initialTeams, members }: ArenaPanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [rankLabel, setRankLabel] = useState("");
  const [roster, setRoster] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const memberById = new Map(members.map((m) => [m.id, m]));
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

    const res = await fetch("/api/admin/arena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tagline: tagline || null,
        rankLabel: rankLabel || null,
        slots: slots.length > 0 ? slots : undefined,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to create team");
      return;
    }

    setName("");
    setTagline("");
    setRankLabel("");
    setRoster({});
    router.refresh();
  }

  async function patchTeam(team: ArenaTeamDTO, payload: Record<string, unknown>) {
    await fetch(`/api/admin/arena/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    router.refresh();
  }

  async function updateSlot(team: ArenaTeamDTO, slotIndex: number, memberId: string | null) {
    const slots = buildSlots(team).map((slot) =>
      slot.index === slotIndex ? { ...slot, memberId } : slot
    );
    await patchTeam(team, { slots });
  }

  async function updateRoleLabel(team: ArenaTeamDTO, slotIndex: number, roleLabel: string) {
    const slots = buildSlots(team).map((slot) =>
      slot.index === slotIndex ? { ...slot, roleLabel: roleLabel || null } : slot
    );
    await patchTeam(team, { slots });
  }

  async function removeTeam(team: ArenaTeamDTO) {
    await fetch(`/api/admin/arena/${team.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <p className="mb-4 text-sm font-medium text-zinc-700">New 3v3 team</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="team-name" className="mb-1 block text-sm font-medium text-zinc-700">
              Team name
            </label>
            <input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="team-tagline" className="mb-1 block text-sm font-medium text-zinc-700">
              Tagline (optional)
            </label>
            <input
              id="team-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="team-rank" className="mb-1 block text-sm font-medium text-zinc-700">
              Rank badge (optional)
            </label>
            <input
              id="team-rank"
              value={rankLabel}
              onChange={(e) => setRankLabel(e.target.value)}
              placeholder="e.g. Thách Đấu"
              className="w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-zinc-700">
            Roster{" "}
            <span className="font-normal text-zinc-400">
              (optional · {Object.keys(roster).length}/3 filled · slot 1 is the captain)
            </span>
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="rounded-md border border-zinc-200 p-2">
                <p className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
                  {index === 0 && <Crown className="h-3 w-3 text-amber-500" aria-hidden="true" />}
                  {SLOT_LABELS[index]}
                </p>
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

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create team"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {initialTeams.length === 0 ? (
        <p className="text-sm text-zinc-500">No 3v3 teams yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {initialTeams.map((team) => {
            const slots = buildSlots(team);
            const assignedInTeam = new Set(
              slots.map((s) => s.memberId).filter((id): id is string => Boolean(id))
            );
            return (
              <div
                key={team.id}
                className={`rounded-xl border bg-white p-5 ${
                  team.isActive ? "border-zinc-200" : "border-zinc-200 opacity-70"
                }`}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      defaultValue={team.name}
                      onBlur={(e) =>
                        e.target.value !== team.name && patchTeam(team, { name: e.target.value })
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm font-medium text-zinc-900"
                    />
                    <input
                      defaultValue={team.tagline ?? ""}
                      placeholder="tagline"
                      onBlur={(e) => patchTeam(team, { tagline: e.target.value || null })}
                      className="w-44 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600"
                    />
                    <input
                      defaultValue={team.rankLabel ?? ""}
                      placeholder="rank badge"
                      onBlur={(e) => patchTeam(team, { rankLabel: e.target.value || null })}
                      className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => patchTeam(team, { isActive: !team.isActive })}
                      className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-zinc-100"
                    >
                      {team.isActive ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTeam(team)}
                      className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Battle record */}
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <RecordControl
                    label="Wins"
                    value={team.wins}
                    onChange={(wins) => patchTeam(team, { wins })}
                  />
                  <RecordControl
                    label="Losses"
                    value={team.losses}
                    onChange={(losses) => patchTeam(team, { losses })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {slots.map((slot) => (
                    <div key={slot.index} className="rounded-md border border-zinc-200 p-2">
                      <p className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
                        {slot.index === 0 && (
                          <Crown className="h-3 w-3 text-amber-500" aria-hidden="true" />
                        )}
                        {SLOT_LABELS[slot.index]}
                      </p>
                      <div className="flex items-center gap-2">
                        <MemberPicker
                          members={members}
                          value={slot.memberId}
                          onChange={(memberId) => updateSlot(team, slot.index, memberId)}
                          disabledIds={assignedInTeam}
                        />
                        <input
                          defaultValue={slot.roleLabel ?? ""}
                          placeholder="role"
                          onBlur={(e) => updateRoleLabel(team, slot.index, e.target.value)}
                          className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {slots.some((slot) => slot.memberId && !memberById.has(slot.memberId)) && (
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

/** Normalises a team's slots to a fixed length-3, index-ordered array. */
function buildSlots(team: ArenaTeamDTO) {
  return Array.from({ length: 3 }, (_, index) => {
    const slot = team.slots.find((s) => s.index === index);
    return {
      index,
      roleLabel: slot?.roleLabel ?? null,
      memberId: slot?.memberId ?? null,
    };
  });
}

function RecordControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Decrease ${label}`}
          className="cursor-pointer rounded-md border border-zinc-300 p-1 transition-colors hover:bg-zinc-100"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-7 text-center text-sm font-semibold tabular-nums text-zinc-900">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="cursor-pointer rounded-md border border-zinc-300 p-1 transition-colors hover:bg-zinc-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
