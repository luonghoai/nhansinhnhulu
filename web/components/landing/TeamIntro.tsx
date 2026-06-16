import { CalendarClock, Swords, Users } from "lucide-react";
import { getTeamStats } from "@/lib/queries";
import { CornerFrame, InkWash, SectionHeading } from "./Ornaments";
import { SectionReveal } from "./SectionReveal";

// Stat order is fixed; each entry maps to an icon by position.
const STAT_ICONS = [Users, Swords, CalendarClock];

export async function TeamIntro() {
  let stats = [
    { label: "Thành viên", value: "—" },
    { label: "Phụ bản đã chinh phục", value: "—" },
    { label: "Raid mỗi tuần", value: "—" },
  ];

  try {
    const { memberCount, dungeonsConquered, raidsThisWeek } = await getTeamStats();
    stats = [
      { label: "Thành viên", value: String(memberCount) },
      { label: "Phụ bản đã chinh phục", value: String(dungeonsConquered) },
      { label: "Raid mỗi tuần", value: String(raidsThisWeek) },
    ];
  } catch {
    // Leave the placeholder dashes if the database is unreachable.
  }

  return (
    <section id="team" className="relative overflow-hidden bg-ink-2 px-6 py-24">
      <InkWash variant="team" />

      <SectionReveal className="relative z-10 mx-auto max-w-3xl">
        <SectionHeading kicker="Về guild" title="Về chúng tôi" />

        <p className="mt-6 text-center text-base leading-relaxed text-text-muted">
          Nhân Sinh Như Lữ là một guild PVE của Nghịch Thủy Hàn, tập hợp những lữ khách cùng
          chung chí hướng — luyện tâm, luyện kỹ, cùng nhau vượt qua từng phụ bản. Nội dung
          giới thiệu chi tiết sẽ được cập nhật.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => {
            const Icon = STAT_ICONS[i] ?? Users;
            return (
              <div
                key={stat.label}
                className="frame-hairline relative rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 text-center backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-[var(--glass-border-hover)] hover:bg-[var(--glass-bg-hover)] hover:shadow-[var(--glow-jade)]"
              >
                <CornerFrame />
                <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-jade/30 bg-jade/10 text-jade">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="font-display text-3xl font-semibold text-gold">{stat.value}</p>
                <span className="mx-auto mt-2 block h-px w-8 bg-jade/40" />
                <p className="mt-2 text-sm text-text-muted">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </SectionReveal>
    </section>
  );
}
