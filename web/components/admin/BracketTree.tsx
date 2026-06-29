"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Crown } from "lucide-react";
import type { BattleEventDTO, BattleTeamDTO, BracketMatchDTO } from "@/lib/dto";

/** Shared result toggle button (also used by the round-robin sections in BattlePanel). */
export function ResultButton({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-300 text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      {label}
    </button>
  );
}

// ---- Layout constants (px) ----
const COL_W = 248; // horizontal stride between rounds
const CARD_W = 208;
const ROW_UNIT = 176; // vertical stride for the busiest column
const BAND_HEADER_H = 30;
const BAND_GAP = 48;
const PAD = 16;

type Pos = { x: number; y: number };
type Anchor = { left: number; right: number; aY: number; bY: number; outY: number };

type Layout = {
  positions: Map<string, Pos>;
  width: number;
  height: number;
  wbTop: number;
  lbTop: number;
  wbCounts: number[];
  lbCounts: number[];
  gfCol: number;
};

function computeLayout(matches: BracketMatchDTO[]): Layout {
  const wb = matches.filter((m) => m.bracket === "WB");
  const lb = matches.filter((m) => m.bracket === "LB");
  const gf = matches.filter((m) => m.bracket === "GF");

  const countsFor = (list: BracketMatchDTO[]): number[] => {
    const maxRound = list.reduce((mx, m) => Math.max(mx, m.round), -1);
    const counts = Array<number>(maxRound + 1).fill(0);
    for (const m of list) counts[m.round] += 1;
    return counts;
  };
  const wbCounts = countsFor(wb);
  const lbCounts = countsFor(lb);

  const wbBandH = ROW_UNIT * Math.max(1, ...wbCounts);
  const lbBandH = ROW_UNIT * Math.max(1, ...lbCounts, 0);

  const wbTop = BAND_HEADER_H;
  const lbTop = wbTop + wbBandH + BAND_GAP + BAND_HEADER_H;
  const gfCol = Math.max(wbCounts.length, lbCounts.length);

  const positions = new Map<string, Pos>();
  for (const m of wb) {
    positions.set(m.matchId, {
      x: m.round * COL_W,
      y: wbTop + (wbBandH * (m.slot + 0.5)) / wbCounts[m.round],
    });
  }
  for (const m of lb) {
    positions.set(m.matchId, {
      x: m.round * COL_W,
      y: lbTop + (lbBandH * (m.slot + 0.5)) / lbCounts[m.round],
    });
  }
  const midY = (wbTop + (lbTop + lbBandH)) / 2;
  for (const m of gf) {
    positions.set(m.matchId, { x: gfCol * COL_W, y: midY });
  }

  const width = (gfCol + 1) * COL_W - (COL_W - CARD_W) + PAD;
  const height = lbTop + lbBandH + PAD;
  return { positions, width, height, wbTop, lbTop, wbCounts, lbCounts, gfCol };
}

/** Caption shown above each column (strips the "Nhánh … · " prefix from the match label). */
function columnCaption(label: string): string {
  const parts = label.split("·");
  return (parts[parts.length - 1] ?? label).trim();
}

export function BracketTree({
  event,
  teamById,
  busy,
  onRecord,
}: {
  event: BattleEventDTO;
  teamById: Map<string, BattleTeamDTO>;
  busy: boolean;
  onRecord: (matchId: string, index: number, winnerTeamId: string | null) => void;
}) {
  const matches = [...event.bracket!.matches].sort((a, b) => a.order - b.order);
  const layout = computeLayout(matches);
  const teamName = (tid: string | null) => (tid ? (teamById.get(tid)?.name ?? "?") : "—");

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());
  const rowAEls = useRef(new Map<string, HTMLElement>());
  const rowBEls = useRef(new Map<string, HTMLElement>());
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({});

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base = canvas.getBoundingClientRect();
    const next: Record<string, Anchor> = {};
    for (const m of matches) {
      const card = cardEls.current.get(m.matchId);
      const ra = rowAEls.current.get(m.matchId);
      const rb = rowBEls.current.get(m.matchId);
      if (!card || !ra || !rb) continue;
      const c = card.getBoundingClientRect();
      const a = ra.getBoundingClientRect();
      const b = rb.getBoundingClientRect();
      const aY = (a.top + a.bottom) / 2 - base.top;
      const bY = (b.top + b.bottom) / 2 - base.top;
      next[m.matchId] = {
        left: c.left - base.left,
        right: c.right - base.left,
        aY,
        bY,
        outY: (aY + bY) / 2,
      };
    }
    setAnchors(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.bracket]);

  useLayoutEffect(() => {
    measure();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(canvas);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // Build connector edges from the resolved anchors.
  const edges: { from: Anchor; toX: number; toY: number; drop: boolean }[] = [];
  for (const m of matches) {
    const target = anchors[m.matchId];
    if (!target) continue;
    for (const side of ["a", "b"] as const) {
      const src = side === "a" ? m.aSource : m.bSource;
      const s = src as { kind: string; matchId?: string };
      if (s.kind !== "winner" && s.kind !== "loser") continue;
      const from = s.matchId ? anchors[s.matchId] : undefined;
      if (!from) continue;
      edges.push({
        from,
        toX: target.left,
        toY: side === "a" ? target.aY : target.bY,
        drop: s.kind === "loser",
      });
    }
  }

  const elbow = (e: (typeof edges)[number]) => {
    const fromX = e.from.right;
    const fromY = e.from.outY;
    const midX = (fromX + e.toX) / 2;
    return `M ${fromX} ${fromY} H ${midX} V ${e.toY} H ${e.toX}`;
  };

  const colCaption = (bracket: "WB" | "LB", round: number) => {
    const m = matches.find((x) => x.bracket === bracket && x.round === round);
    return m ? columnCaption(m.label) : "";
  };

  return (
    <div className="overflow-x-auto">
      <div
        ref={canvasRef}
        className="relative"
        style={{ width: layout.width, height: layout.height, minWidth: layout.width }}
      >
        {/* Band headers */}
        <span
          className="absolute text-xs font-semibold uppercase tracking-wide text-emerald-700"
          style={{ left: 0, top: layout.wbTop - BAND_HEADER_H + 4 }}
        >
          Nhánh thắng
        </span>
        <span
          className="absolute text-xs font-semibold uppercase tracking-wide text-amber-700"
          style={{ left: 0, top: layout.lbTop - BAND_HEADER_H + 4 }}
        >
          Nhánh thua
        </span>

        {/* Column captions */}
        {layout.wbCounts.map((_, r) => (
          <span
            key={`wbc-${r}`}
            className="absolute text-[11px] text-zinc-400"
            style={{ left: r * COL_W, top: layout.wbTop - 16 }}
          >
            {colCaption("WB", r)}
          </span>
        ))}
        {layout.lbCounts.map((_, r) => (
          <span
            key={`lbc-${r}`}
            className="absolute text-[11px] text-zinc-400"
            style={{ left: r * COL_W, top: layout.lbTop - 16 }}
          >
            {colCaption("LB", r)}
          </span>
        ))}

        {/* SVG connectors (under the cards) */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={layout.width}
          height={layout.height}
        >
          {edges.map((e, i) => (
            <path
              key={i}
              d={elbow(e)}
              fill="none"
              stroke={e.drop ? "#d97706" : "#a1a1aa"}
              strokeWidth={1.5}
              strokeDasharray={e.drop ? "4 3" : undefined}
            />
          ))}
        </svg>

        {/* Match nodes */}
        {matches.map((m) => {
          const pos = layout.positions.get(m.matchId)!;
          return (
            <div
              key={m.matchId}
              className="absolute"
              style={{ left: pos.x, top: pos.y, width: CARD_W, transform: "translateY(-50%)" }}
            >
              <BracketNode
                match={m}
                teamName={teamName}
                busy={busy}
                onRecord={(index, winner) => onRecord(m.matchId, index, winner)}
                setCardRef={(el) => setRef(cardEls, m.matchId, el)}
                setRowARef={(el) => setRef(rowAEls, m.matchId, el)}
                setRowBRef={(el) => setRef(rowBEls, m.matchId, el)}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-[1.5px] border-zinc-400" /> thắng tiến lên
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-[1.5px] border-dashed border-amber-600" /> thua rớt nhánh
        </span>
      </div>
    </div>
  );
}

function setRef(map: React.RefObject<Map<string, HTMLElement>>, id: string, el: HTMLElement | null) {
  if (el) map.current.set(id, el);
  else map.current.delete(id);
}

function BracketNode({
  match,
  teamName,
  busy,
  onRecord,
  setCardRef,
  setRowARef,
  setRowBRef,
}: {
  match: BracketMatchDTO;
  teamName: (tid: string | null) => string;
  busy: boolean;
  onRecord: (index: number, winnerTeamId: string | null) => void;
  setCardRef: (el: HTMLElement | null) => void;
  setRowARef: (el: HTMLElement | null) => void;
  setRowBRef: (el: HTMLElement | null) => void;
}) {
  const wins = (tid: string | null) =>
    tid ? match.rounds.filter((w) => w === tid).length : 0;
  const ready = match.aTeamId != null && match.bTeamId != null;
  const isGf = match.bracket === "GF";

  const teamRow = (tid: string | null, rowRef: (el: HTMLElement | null) => void) => (
    <div ref={rowRef} className="flex items-center justify-between gap-1.5">
      <span className="flex items-center gap-1 truncate">
        {match.winnerTeamId === tid && tid && (
          <Crown className="h-3 w-3 shrink-0 text-amber-500" aria-hidden="true" />
        )}
        <span className="truncate text-sm font-medium">{teamName(tid)}</span>
      </span>
      <span className="rounded-full bg-zinc-100 px-1.5 text-xs font-semibold tabular-nums">
        {wins(tid)}
      </span>
    </div>
  );

  return (
    <div
      ref={setCardRef}
      className={`rounded-md border bg-white p-2.5 shadow-sm ${
        isGf ? "border-amber-300" : "border-zinc-200"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between text-[10px] text-zinc-400">
        <span className="truncate">{columnCaption(match.label)}</span>
        <span>Bo{match.bestOf}</span>
      </div>

      <div className="flex flex-col gap-1">
        {teamRow(match.aTeamId, setRowARef)}
        {teamRow(match.bTeamId, setRowBRef)}
      </div>

      {ready ? (
        <div className="mt-2 flex flex-col gap-1 border-t border-zinc-100 pt-2">
          {match.rounds.map((winner, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-10 shrink-0 text-zinc-400">Hiệp {i + 1}</span>
              <div className="flex gap-1">
                {[match.aTeamId, match.bTeamId].map((tid) => (
                  <ResultButton
                    key={tid}
                    active={winner === tid}
                    label={teamName(tid)}
                    disabled={busy}
                    onClick={() => onRecord(i, winner === tid ? null : tid)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 border-t border-zinc-100 pt-2 text-[11px] text-zinc-400">
          Chờ đội từ vòng trước.
        </p>
      )}
    </div>
  );
}
