import { MessageCircle } from "lucide-react";

const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;

export function Footer() {
  return (
    <footer className="border-t border-[var(--glass-border)] bg-ink px-6 py-8 text-center text-sm text-text-muted">
      {DISCORD_INVITE_URL && (
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-text backdrop-blur-md transition-all duration-200 hover:border-[var(--glass-border-hover)] hover:bg-[var(--glass-bg-hover)] hover:text-jade focus-visible:outline focus-visible:outline-2 focus-visible:outline-jade"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Tham gia Discord
        </a>
      )}
      <p>© {new Date().getFullYear()} Nhân Sinh Như Lữ — Nghịch Thủy Hàn</p>
    </footer>
  );
}
