"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import type { MemberDTO } from "@/lib/dto";
import { MemberPicker } from "../MemberPicker";

export type EntrantInput = { name: string; memberId: string | null };

interface EntrantsEditorProps {
  members: MemberDTO[];
  initial: EntrantInput[];
  onSave: (entrants: EntrantInput[]) => Promise<void>;
}

const ROWS = 20;

export function EntrantsEditor({ members, initial, onSave }: EntrantsEditorProps) {
  const [rows, setRows] = useState<EntrantInput[]>(() =>
    Array.from({ length: ROWS }, (_, i) => initial[i] ?? { name: "", memberId: null })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = rows.filter((r) => r.name.trim().length > 0).length;
  const ready = filled === ROWS;

  const dupeNames = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [rows]);

  const linkedMemberIds = useMemo(
    () => new Set(rows.map((r) => r.memberId).filter((m): m is string => Boolean(m))),
    [rows]
  );

  function setName(index: number, name: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, name } : r)));
  }

  function setMember(index: number, memberId: string | null) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        // Auto-fill the name from the linked member if the row is still empty.
        const member = members.find((m) => m.id === memberId);
        const name = r.name.trim() === "" && member ? member.discordName : r.name;
        return { ...r, memberId, name };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(rows.map((r) => ({ name: r.name.trim(), memberId: r.memberId })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được danh sách.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-700">
          Người chơi{" "}
          <span className={`font-normal ${ready ? "text-emerald-600" : "text-zinc-400"}`}>
            ({filled}/{ROWS})
          </span>
        </p>
        {dupeNames.size > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Có tên trùng nhau
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((row, index) => {
          const isDupe = row.name.trim() !== "" && dupeNames.has(row.name.trim().toLowerCase());
          return (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border border-zinc-200 p-2"
            >
              <span className="w-6 shrink-0 text-center text-xs font-medium tabular-nums text-zinc-400">
                {index + 1}
              </span>
              <label htmlFor={`entrant-${index}`} className="sr-only">
                Tên người chơi {index + 1}
              </label>
              <input
                id={`entrant-${index}`}
                value={row.name}
                onChange={(e) => setName(index, e.target.value)}
                placeholder="Tên người chơi"
                className={`w-36 shrink-0 rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-1 ${
                  isDupe
                    ? "border-amber-300 focus:border-amber-400 focus:ring-amber-400"
                    : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500"
                }`}
              />
              <MemberPicker
                members={members}
                value={row.memberId}
                onChange={(memberId) => setMember(index, memberId)}
                disabledIds={linkedMemberIds}
                placeholder="— liên kết —"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!ready || saving}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Đang lưu..." : "Lưu danh sách"}
        </button>
        {!ready && (
          <span className="text-xs text-zinc-400">Cần đủ {ROWS} tên để lưu.</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
