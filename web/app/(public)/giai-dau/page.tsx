import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { SectionReveal } from "@/components/landing/SectionReveal";
import { PublicBracket } from "@/components/tournament/PublicBracket";
import { RulesScroll } from "@/components/tournament/RulesScroll";
import { TournamentHero } from "@/components/tournament/TournamentHero";
import { getFeaturedTournament } from "@/lib/queries";

export const metadata = {
  title: "Giải Đấu Cờ 5 Quân — Nhân Sinh Như Lữ",
  description:
    "Giải đấu Cờ 5 Quân của bang Nhân Sinh Như Lữ trong Nghịch Thủy Hàn — bảng đấu, luật chơi và bảng xếp hạng.",
};

export default async function TournamentPage() {
  let featured: Awaited<ReturnType<typeof getFeaturedTournament>> = null;
  let error: string | null = null;

  try {
    featured = await getFeaturedTournament();
  } catch {
    error = "Không thể tải dữ liệu giải đấu lúc này.";
  }

  return (
    <>
      <Navbar />

      <main className="arena-paper relative text-[#2a2e2b]">
        <TournamentHero
          eventTitle={featured?.tournament.title}
          startAt={featured?.tournament.startAt}
        />

        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-2">
          {error && <p className="text-center text-[#6b6f68]">{error}</p>}

          {!error && !featured && (
            <p className="text-center text-[#6b6f68]">
              Chưa có giải đấu nào — hãy quay lại sau.
            </p>
          )}

          {!error && featured && (
            <SectionReveal>
              <PublicBracket
                tournament={featured.tournament}
                members={featured.members}
              />
            </SectionReveal>
          )}
        </section>

        <section className="relative z-10 px-6 pb-24">
          <RulesScroll />
        </section>
      </main>

      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
