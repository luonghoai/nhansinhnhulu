import { getNearestRaids } from "@/lib/queries";
import { InkWash, SectionHeading } from "./Ornaments";
import { RaidCard } from "./RaidCard";
import { SectionReveal } from "./SectionReveal";

export async function RaidSection() {
  let raids: Awaited<ReturnType<typeof getNearestRaids>> = [];
  let error: string | null = null;

  try {
    raids = await getNearestRaids();
  } catch {
    error = "Không thể tải dữ liệu raid lúc này.";
  }

  return (
    <section id="raids" className="relative overflow-hidden bg-ink px-6 py-24">
      <InkWash variant="raids" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <SectionReveal className="mb-12">
          <SectionHeading kicker="Lịch chinh phục" title="Raid sắp tới" />
        </SectionReveal>

        {error && <p className="text-center text-text-muted">{error}</p>}

        {!error && raids.length === 0 && (
          <p className="text-center text-text-muted">
            No upcoming raids scheduled — check back soon.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {raids.map(({ raid, dungeon, members }) => (
            <SectionReveal key={raid.id}>
              <RaidCard raid={raid} dungeon={dungeon} members={members} />
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
