import { ChevronDown } from "lucide-react";
import { HeroVideoBackground } from "./HeroVideoBackground";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink">
      <HeroVideoBackground />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-text-muted">
          Nghịch Thủy Hàn · PVE Guild
        </p>
        <h1 className="mb-4 font-display text-5xl font-bold tracking-tight text-text sm:text-7xl">
          Nhân Sinh Như Lữ
        </h1>
        <p className="mx-auto max-w-xl text-base text-text-muted sm:text-lg">
          Đồng hành trên mọi nẻo đường — cùng chinh phục từng phụ bản, cùng viết tiếp hành trình.
        </p>
        <a
          href="#raids"
          className="mt-8 inline-block cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-6 py-3 text-sm font-medium text-text backdrop-blur-md transition-all duration-200 hover:border-[var(--glass-border-hover)] hover:bg-[var(--glass-bg-hover)] hover:shadow-[var(--glow-jade)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-jade"
        >
          Xem lịch raid sắp tới
        </a>
      </div>

      <a
        href="#team"
        aria-label="Cuộn xuống"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 cursor-pointer text-text-muted transition-colors duration-200 hover:text-jade motion-safe:animate-bounce"
      >
        <ChevronDown className="h-6 w-6" aria-hidden="true" />
      </a>
    </section>
  );
}
