"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/dungeons", label: "Dungeons" },
  { href: "/admin/raids", label: "Raids" },
  { href: "/admin/battles", label: "3v3 Battle" },
  { href: "/admin/tournaments", label: "Giải Đấu" },
  { href: "/admin/requests", label: "Join Requests" },
  { href: "/admin/messages", label: "Message" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return null;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold tracking-wide text-zinc-900">
          NSNL Admin
        </span>
        <nav className="flex items-center gap-4 text-sm">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "font-medium text-zinc-900 cursor-pointer"
                    : "text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                }
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
