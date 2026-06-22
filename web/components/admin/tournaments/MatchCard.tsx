"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { MatchDTO } from "@/lib/dto";
import { isValidBo3 } from "@/lib/tournament";

interface MatchCardProps {
  match: MatchDTO;
  nameOf: (entrantId: string | null) => string;
  /** Records a score; resolves when persisted (parent refreshes). */
  onRecord: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
  /** Optional label, e.g. "Trận 1". */
  label?: string;
}

export function MatchCard({ match, nameOf, onRecord, label }: MatchCardProps) {
  const ready = match.aId !== null && match.bId !== null;
  const [a, setA] = useState(match.scoreA?.toString() ?? "");
  const [b, setB] = useState(match.scoreB?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trySave(nextA: string, nextB: string) {
    if (nextA === "" || nextB === "") return;
    const na = Number(nextA);
    const nb = Number(nextB);
    if (!isValidBo3(na, nb)) {
      setError("Chỉ 2-0, 2-1, 0-2, 1-2");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onRecord(match.matchId, na, nb);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  }

  const winsA = match.winnerId !== null && match.winnerId === match.aId;
  const winsB = match.winnerId !== null && match.winnerId === match.bId;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2.5 text-sm">
      {label && <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>}
      <Side
        name={ready ? nameOf(match.aId) : "Chờ kết quả"}
        tbd={!ready}
        win={winsA}
        value={a}
        disabled={!ready || saving}
        onChange={(v) => {
          setA(v);
          void trySave(v, b);
        }}
      />
      <div className="my-1 h-px bg-zinc-100" />
      <Side
        name={ready ? nameOf(match.bId) : "Chờ kết quả"}
        tbd={!ready}
        win={winsB}
        value={b}
        disabled={!ready || saving}
        onChange={(v) => {
          setB(v);
          void trySave(a, v);
        }}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Side({
  name,
  tbd,
  win,
  value,
  disabled,
  onChange,
}: {
  name: string;
  tbd: boolean;
  win: boolean;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded px-1.5 py-1 ${
        win ? "bg-emerald-50 ring-1 ring-emerald-500" : ""
      }`}
    >
      <span className={`flex min-w-0 items-center gap-1 ${tbd ? "italic text-zinc-400" : "text-zinc-900"}`}>
        {win && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />}
        <span className="truncate">{name}</span>
      </span>
      <label className="sr-only">{`Số ván thắng của ${name}`}</label>
      <input
        type="number"
        min={0}
        max={2}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 shrink-0 rounded border border-zinc-300 px-1.5 py-0.5 text-center text-sm tabular-nums focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-50 disabled:text-zinc-300"
      />
    </div>
  );
}
