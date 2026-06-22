"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--glass-border)] bg-ink/60 backdrop-blur-[var(--glass-blur-nav)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="font-display text-sm font-semibold tracking-widest text-text">
          NHÂN SINH NHƯ LỮ
        </span>
        <div className="flex items-center gap-6 text-sm text-text-muted">
          <Link
            href="/#team"
            className="cursor-pointer rounded-sm transition-colors duration-200 hover:text-jade focus-visible:outline focus-visible:outline-2 focus-visible:outline-jade"
          >
            Team
          </Link>
          <Link
            href="/#raids"
            className="cursor-pointer rounded-sm transition-colors duration-200 hover:text-jade focus-visible:outline focus-visible:outline-2 focus-visible:outline-jade"
          >
            Raids
          </Link>
          <Link
            href="/3v3"
            className="cursor-pointer rounded-sm transition-colors duration-200 hover:text-jade focus-visible:outline focus-visible:outline-2 focus-visible:outline-jade"
          >
            Đấu Trường 3v3
          </Link>
          <Link
            href="/giai-dau"
            className="cursor-pointer rounded-sm transition-colors duration-200 hover:text-jade focus-visible:outline focus-visible:outline-2 focus-visible:outline-jade"
          >
            Cờ 5 Quân
          </Link>
        </div>
      </div>
    </nav>
  );
}
