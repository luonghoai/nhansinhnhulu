"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { Crown, Trophy, X } from "lucide-react";
import { classIconSrc } from "@/lib/assets";
import { isTovanIcon } from "@/lib/classes";
import type { BattleEventDTO, BattleTeamDTO, MemberDTO } from "@/lib/dto";
import { MemberPicker } from "./MemberPicker";
import { BracketTree, ResultButton } from "./BracketTree";

interface BattlePanelProps {
  initialEvents: BattleEventDTO[];
  members: MemberDTO[];
}

const STATUS_LABELS: Record<BattleEventDTO["status"], string> = {
  draft: "Nháp",
  open: "Mở đăng ký",
  teams_generated: "Đã chia đội",
  group_stage: "Vòng bảng",
  final_stage: "Chung kết",
  bracket_stage: "Nhánh đấu",
  completed: "Hoàn thành",
};

const FORMAT_LABELS: Record<BattleEventDTO["format"], string> = {
  round_robin: "Vòng bảng + Chung kết Bo5",
  double_elim: "Loại trực tiếp 2 nhánh (Bo3)",
};

const TEAM_SIZE = 3;

export function BattlePanel({ initialEvents, members }: BattlePanelProps) {
  const router = useRouter();
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const [selectedId, setSelectedId] = useState<string | null>(
    initialEvents[0]?.id ?? null
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [format, setFormat] = useState<BattleEventDTO["format"]>("round_robin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = initialEvents.find((e) => e.id === selectedId) ?? null;

  async function api(path: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      // 409 confirm flows are handled by callers via the returned false + message.
      setError(data?.message ?? data?.error ?? "Có lỗi xảy ra");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startAt) {
      setError("Chọn thời gian bắt đầu");
      return;
    }
    const ok = await api("/api/admin/battles", "POST", {
      title,
      description: description || null,
      startAt: new Date(startAt).toISOString(),
      format,
    });
    if (ok) {
      setTitle("");
      setDescription("");
      setStartAt("");
      setFormat("round_robin");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* ---- Left: create + list ---- */}
      <div>
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <p className="mb-3 text-sm font-medium text-zinc-700">Sự kiện 3v3 mới</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Tên sự kiện"
            className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả (tuỳ chọn)"
            className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
            className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as BattleEventDTO["format"])}
            className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {(Object.keys(FORMAT_LABELS) as BattleEventDTO["format"][]).map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Tạo sự kiện
          </button>
        </form>

        <div className="flex flex-col gap-1">
          {initialEvents.length === 0 && (
            <p className="text-sm text-zinc-500">Chưa có sự kiện nào.</p>
          )}
          {initialEvents.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedId(ev.id)}
              className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                ev.id === selectedId
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                {ev.status === "completed" && (
                  <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                )}
                <span className="truncate">{ev.title}</span>
              </span>
              <span className="shrink-0 text-xs text-zinc-400">{STATUS_LABELS[ev.status]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Right: detail ---- */}
      <div>
        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {selected ? (
          <BattleDetail
            event={selected}
            members={members}
            memberById={memberById}
            busy={busy}
            api={api}
          />
        ) : (
          <p className="text-sm text-zinc-500">Chọn hoặc tạo một sự kiện để bắt đầu.</p>
        )}
      </div>
    </div>
  );
}

interface DetailProps {
  event: BattleEventDTO;
  members: MemberDTO[];
  memberById: Map<string, MemberDTO>;
  busy: boolean;
  api: (path: string, method: string, body?: unknown) => Promise<boolean>;
}

function BattleDetail({ event, members, memberById, busy, api }: DetailProps) {
  const base = `/api/admin/battles/${event.id}`;
  const isDoubleElim = event.format === "double_elim";
  const poolValid =
    event.participants.length >= TEAM_SIZE * 2 &&
    event.participants.length % TEAM_SIZE === 0;
  const remainder = event.participants.length % TEAM_SIZE;
  const teamCount = Math.floor(event.participants.length / TEAM_SIZE);

  // Each team must field exactly one Tố Vấn → pool needs exactly `teamCount` of them.
  const tovanCount = event.participants.reduce(
    (n, pid) => n + (isTovanIcon(memberById.get(pid)?.classIcon) ? 1 : 0),
    0
  );
  const tovanBalanced = poolValid && tovanCount === teamCount;
  // Double-elim needs a power-of-two team count (4 / 8 / 16).
  const bracketSizeValid = teamCount >= 4 && (teamCount & (teamCount - 1)) === 0;
  const canGenerate = tovanBalanced && (!isDoubleElim || bracketSizeValid);

  const teamById = new Map(event.teams.map((t) => [t.teamId, t]));
  const standings = [...event.teams].sort((a, b) => b.groupPoints - a.groupPoints);
  const groupComplete =
    event.groupMatchups.length > 0 && event.groupMatchups.every((m) => m.result !== null);

  const [picker, setPicker] = useState<string | null>(null);
  const [finalists, setFinalists] = useState<string[]>([]);

  async function addParticipant(memberId: string | null) {
    if (!memberId) return;
    await api(`${base}/participants`, "POST", { memberId });
    setPicker(null);
  }

  async function generateTeams() {
    const hasResults =
      event.groupMatchups.some((m) => m.result !== null) ||
      event.final !== null ||
      (event.bracket?.matches ?? []).some((m) => m.rounds.some((r) => r !== null));
    if (hasResults && !confirm("Tạo lại đội sẽ xóa toàn bộ kết quả đã ghi. Tiếp tục?")) return;
    await api(`${base}/generate-teams`, "POST", { confirmReset: hasResults });
  }

  async function recordMatchup(matchupId: string, result: string | null) {
    const ok = await api(`${base}/matchups/${matchupId}`, "PATCH", { result });
    if (!ok && event.final) {
      // The API blocks with needs-confirm when the change unseats a finalist.
      if (confirm("Kết quả mới làm thay đổi top 2 — chung kết sẽ bị đặt lại. Tiếp tục?")) {
        await api(`${base}/matchups/${matchupId}`, "PATCH", { result, confirmReset: true });
      }
    }
  }

  function toggleFinalist(teamId: string) {
    setFinalists((prev) =>
      prev.includes(teamId)
        ? prev.filter((t) => t !== teamId)
        : prev.length < 2
          ? [...prev, teamId]
          : prev
    );
  }

  async function advanceFinal() {
    if (finalists.length !== 2) return;
    const ok = await api(`${base}/advance-final`, "POST", { teamIds: finalists });
    if (ok) setFinalists([]);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <p className="text-lg font-semibold text-zinc-900">{event.title}</p>
          <p className="text-xs text-zinc-500">
            {STATUS_LABELS[event.status]} · {FORMAT_LABELS[event.format]} ·{" "}
            {new Date(event.startAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => api(`${base}/announce`, "POST")}
            className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-60"
          >
            {event.announceMessageId ? "Cập nhật thông báo" : "Thông báo Discord"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm("Xóa sự kiện này?")) api(base, "DELETE");
            }}
            className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            Xóa
          </button>
        </div>
      </div>

      {/* 1. Pool */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">
            Danh sách tham gia{" "}
            <span className="font-normal text-zinc-400">
              ({event.participants.length} người ·{" "}
              {poolValid
                ? `${teamCount} đội`
                : remainder === 0
                  ? `cần tối thiểu ${TEAM_SIZE * 2}`
                  : `thêm/bớt ${TEAM_SIZE - remainder} để chia hết ${TEAM_SIZE}`}
              )
            </span>
          </p>
          <div className="flex items-center gap-2">
            {poolValid && isDoubleElim && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  bracketSizeValid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {bracketSizeValid ? `${teamCount} đội` : "Cần 4/8/16 đội"}
              </span>
            )}
            {poolValid && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  tovanBalanced
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                Tố Vấn: {tovanCount} / {teamCount}
              </span>
            )}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {event.participants.map((pid) => {
            const m = memberById.get(pid);
            return (
              <span
                key={pid}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-2 pr-1 text-sm"
              >
                <MemberChip member={m} fallback={pid} />
                <button
                  type="button"
                  onClick={() => api(`${base}/participants/${pid}`, "DELETE")}
                  className="cursor-pointer rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
          {event.participants.length === 0 && (
            <span className="text-sm text-zinc-400">Chưa có người tham gia.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <MemberPicker
            members={members}
            value={picker}
            onChange={addParticipant}
            disabledIds={new Set(event.participants)}
            placeholder="+ Thêm thành viên"
          />
        </div>
      </section>

      {/* 2. Generate teams */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Đội hình</p>
          <button
            type="button"
            disabled={busy || !canGenerate}
            title={
              poolValid && !tovanBalanced
                ? `Cần đúng ${teamCount} Tố Vấn cho ${teamCount} đội (hiện có ${tovanCount}).`
                : poolValid && isDoubleElim && !bracketSizeValid
                  ? `Nhánh loại trực tiếp cần 4/8/16 đội (hiện có ${teamCount}).`
                  : undefined
            }
            onClick={generateTeams}
            className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {event.teams.length > 0 ? "Chia lại đội" : "Chia đội (1 Tố Vấn/đội)"}
          </button>
        </div>
        {event.teams.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa chia đội.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {event.teams.map((team) => (
              <TeamCard
                key={team.teamId}
                team={team}
                memberById={memberById}
                champion={event.championTeamId === team.teamId}
                onRename={(name) => api(`${base}/teams/${team.teamId}`, "PATCH", { name })}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Group stage (round-robin format only) */}
      {!isDoubleElim && event.groupMatchups.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-zinc-700">
            Vòng bảng{" "}
            <span className="font-normal text-zinc-400">
              ({event.groupMatchups.filter((m) => m.result !== null).length}/
              {event.groupMatchups.length} trận)
            </span>
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
            {/* Matchups */}
            <div className="flex flex-col gap-2">
              {event.groupMatchups.map((m) => {
                const a = teamById.get(m.teamAId);
                const b = teamById.get(m.teamBId);
                return (
                  <div
                    key={m.matchupId}
                    className="flex items-center gap-2 rounded-md border border-zinc-100 px-2 py-1.5 text-sm"
                  >
                    <span className="flex-1 truncate text-right">{a?.name ?? "?"}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <ResultButton
                        active={m.result === "a_win"}
                        label="Thắng A"
                        onClick={() => recordMatchup(m.matchupId, m.result === "a_win" ? null : "a_win")}
                      />
                      <ResultButton
                        active={m.result === "draw"}
                        label="Hòa"
                        onClick={() => recordMatchup(m.matchupId, m.result === "draw" ? null : "draw")}
                      />
                      <ResultButton
                        active={m.result === "b_win"}
                        label="Thắng B"
                        onClick={() => recordMatchup(m.matchupId, m.result === "b_win" ? null : "b_win")}
                      />
                    </div>
                    <span className="flex-1 truncate">{b?.name ?? "?"}</span>
                  </div>
                );
              })}
            </div>

            {/* Standings */}
            <div className="rounded-md border border-zinc-100 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Bảng xếp hạng
              </p>
              <ol className="flex flex-col gap-1 text-sm">
                {standings.map((t, i) => (
                  <li key={t.teamId} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      {groupComplete && (
                        <input
                          type="checkbox"
                          checked={finalists.includes(t.teamId)}
                          onChange={() => toggleFinalist(t.teamId)}
                          className="cursor-pointer"
                        />
                      )}
                      <span className="text-zinc-400">{i + 1}.</span>
                      <span className="truncate">{t.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{t.groupPoints}</span>
                  </li>
                ))}
              </ol>
              {groupComplete && !event.final && (
                <button
                  type="button"
                  disabled={busy || finalists.length !== 2}
                  onClick={advanceFinal}
                  className="mt-3 w-full cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Chọn top 2 → Chung kết
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. Final (round-robin format only) */}
      {!isDoubleElim && event.final && (
        <FinalSection event={event} teamById={teamById} busy={busy} api={api} base={base} />
      )}

      {/* 5. Double-elimination bracket */}
      {isDoubleElim && event.bracket && event.bracket.matches.length > 0 && (
        <BracketSection event={event} teamById={teamById} busy={busy} api={api} base={base} />
      )}
    </div>
  );
}

function FinalSection({
  event,
  teamById,
  busy,
  api,
  base,
}: {
  event: BattleEventDTO;
  teamById: Map<string, BattleTeamDTO>;
  busy: boolean;
  api: DetailProps["api"];
  base: string;
}) {
  const final = event.final!;
  const champion = event.championTeamId ? teamById.get(event.championTeamId) : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-zinc-700">Chung kết (Bo5)</p>

      {champion && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Vô địch: {champion.name}
        </div>
      )}

      <div className="mb-3 flex items-center gap-4 text-sm">
        {final.teamIds.map((tid) => (
          <span key={tid} className="flex items-center gap-1.5">
            <span className="font-medium">{teamById.get(tid)?.name ?? "?"}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {final.roundWins?.[tid] ?? 0}
            </span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {final.rounds.map((winner, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-16 shrink-0 text-zinc-500">Hiệp {i + 1}</span>
            <div className="flex gap-1">
              {final.teamIds.map((tid) => (
                <ResultButton
                  key={tid}
                  active={winner === tid}
                  label={teamById.get(tid)?.name ?? "?"}
                  onClick={() =>
                    api(`${base}/final/rounds/${i}`, "PATCH", {
                      winnerTeamId: winner === tid ? null : tid,
                    })
                  }
                  disabled={busy}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BracketSection({
  event,
  teamById,
  busy,
  api,
  base,
}: {
  event: BattleEventDTO;
  teamById: Map<string, BattleTeamDTO>;
  busy: boolean;
  api: DetailProps["api"];
  base: string;
}) {
  const champion = event.championTeamId ? teamById.get(event.championTeamId) : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-zinc-700">Nhánh loại trực tiếp</p>

      {champion && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Vô địch: {champion.name}
        </div>
      )}

      <BracketTree
        event={event}
        teamById={teamById}
        busy={busy}
        onRecord={(matchId, index, winnerTeamId) =>
          api(`${base}/bracket/matches/${matchId}/games/${index}`, "PATCH", { winnerTeamId })
        }
      />
    </section>
  );
}

function TeamCard({
  team,
  memberById,
  champion,
  onRename,
}: {
  team: BattleTeamDTO;
  memberById: Map<string, MemberDTO>;
  champion: boolean;
  onRename: (name: string) => void;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${champion ? "border-amber-300 bg-amber-50" : "border-zinc-200"}`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        {champion && <Crown className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />}
        <input
          defaultValue={team.name}
          onBlur={(e) => e.target.value.trim() && e.target.value !== team.name && onRename(e.target.value.trim())}
          className="w-full rounded-md border border-transparent px-1 py-0.5 text-sm font-medium text-zinc-900 hover:border-zinc-200 focus:border-zinc-400 focus:outline-none"
        />
      </div>
      <ul className="flex flex-col gap-1">
        {team.memberIds.map((mid) => (
          <li key={mid} className="text-sm">
            <MemberChip member={memberById.get(mid)} fallback={mid} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemberChip({ member, fallback }: { member: MemberDTO | undefined; fallback: string }) {
  if (!member) {
    return <span className="text-zinc-400">#{fallback.slice(-4)}</span>;
  }
  const iconSrc = classIconSrc(member.classIcon);
  return (
    <span className="flex items-center gap-1.5">
      {iconSrc && (
        <Image
          src={iconSrc}
          alt=""
          width={16}
          height={16}
          className="shrink-0 rounded-full"
          unoptimized={iconSrc.endsWith(".svg")}
        />
      )}
      <span className="truncate text-zinc-800">{member.discordName}</span>
    </span>
  );
}
