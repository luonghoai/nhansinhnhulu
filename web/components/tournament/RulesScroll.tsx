import { Swallow } from "./PosterDecor";

const RULES = [
  {
    round: "Vòng 1",
    text: "20 người chơi tham gia được ghép ngẫu nhiên đánh cặp với nhau 3 trận liên tiếp, ai thắng trên 2 trận sẽ đi tiếp.",
  },
  {
    round: "Vòng 2",
    text: "10 người theo thứ tự bảng đấu sẽ đánh cặp với nhau 3 trận liên tiếp, ai thắng trên 2 trận sẽ vào chung kết.",
  },
  {
    round: "Vòng 3 — Chung kết",
    text: "5 người còn lại đấu vòng tròn tính điểm. Mỗi người đánh 4 trận, mỗi lần thắng được cộng 1 điểm; tổng kết tìm ra Top 1 · 2 · 3.",
  },
];

/** The "Luật chơi" rules panel, styled as an inked scroll with swallow accents. */
export function RulesScroll() {
  return (
    <section className="relative mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl border border-[#d8d2c2] bg-[#faf8f1]/85 p-7 shadow-[0_10px_30px_rgba(80,70,40,0.12)] backdrop-blur-sm sm:p-9">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
        />
        <div className="mb-5 flex items-center justify-center gap-3">
          <Swallow className="-scale-x-100" />
          <h2 className="arena-gold-text font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Luật Chơi
          </h2>
          <Swallow />
        </div>

        <ul className="space-y-4">
          {RULES.map((r) => (
            <li key={r.round} className="flex gap-3">
              <Swallow className="mt-1 shrink-0" />
              <p className="text-sm leading-relaxed text-[#4a4f49] sm:text-base">
                <span className="font-semibold text-[#9e2b25]">{r.round}: </span>
                {r.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
