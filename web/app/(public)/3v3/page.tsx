import { ArenaHero } from "@/components/arena/ArenaHero";
import { ArenaTeamCard } from "@/components/arena/ArenaTeamCard";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { SectionReveal } from "@/components/landing/SectionReveal";
import { getArenaTeams } from "@/lib/queries";

export const metadata = {
  title: "Đấu Trường 3v3 — Nhân Sinh Như Lữ",
  description: "Các đội hình 3v3 của bang Nhân Sinh Như Lữ trong Nghịch Thủy Hàn.",
};

export default async function ArenaPage() {
  let teams: Awaited<ReturnType<typeof getArenaTeams>> = [];
  let error: string | null = null;

  try {
    teams = await getArenaTeams();
  } catch {
    error = "Không thể tải dữ liệu đấu trường lúc này.";
  }

  return (
    <>
      <Navbar />

      <main className="arena-paper relative text-[#2a2e2b]">
        <ArenaHero />

        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-4">
          {error && <p className="text-center text-[#6b6f68]">{error}</p>}

          {!error && teams.length === 0 && (
            <p className="text-center text-[#6b6f68]">
              Chưa có đội hình 3v3 nào — hãy quay lại sau.
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {teams.map(({ team, members }) => (
              <SectionReveal key={team.id}>
                <ArenaTeamCard team={team} members={members} />
              </SectionReveal>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
