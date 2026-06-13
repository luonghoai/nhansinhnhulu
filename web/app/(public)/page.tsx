import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { RaidSection } from "@/components/landing/RaidSection";
import { TeamIntro } from "@/components/landing/TeamIntro";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <TeamIntro />
      <RaidSection />
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
