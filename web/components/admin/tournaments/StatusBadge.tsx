import type { TournamentDTO } from "@/lib/dto";

type Status = TournamentDTO["status"];

const STATUS_STYLES: Record<Status, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "border-zinc-200 bg-zinc-100 text-zinc-600" },
  seeded: { label: "Đã bốc thăm", className: "border-blue-200 bg-blue-50 text-blue-700" },
  r1_done: { label: "Xong vòng 1", className: "border-amber-200 bg-amber-50 text-amber-700" },
  r2_done: { label: "Xong vòng 2", className: "border-amber-200 bg-amber-50 text-amber-700" },
  final: { label: "Chung kết", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  completed: {
    label: "Hoàn thành",
    className: "border-emerald-600 bg-emerald-600 text-white",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
