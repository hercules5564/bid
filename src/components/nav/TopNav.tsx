"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Swords } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSession } from "@/components/providers/session";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/leaderboards", label: "Leaderboards" },
];

export function TopNav() {
  const user = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8b34a]/20 bg-[#111111] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(l.href) ? "text-[#e8b34a]" : "text-white/60 hover:text-[#e8b34a]"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/showdown"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              isActive("/showdown") ? "text-[#e8b34a]" : "text-[#e8b34a]/70 hover:text-[#e8b34a]"
            )}
          >
            <Swords size={15} />
            Showdown
          </Link>
        </nav>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/browse?q=${encodeURIComponent(q.trim())}`);
          }}
          className="ml-auto hidden items-center gap-2 rounded-lg border border-[#e8b34a]/40 px-3 py-2 lg:flex lg:w-64"
        >
          <Search size={15} className="text-[#e8b34a]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lots…"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          {user ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-lg border border-[#e8b34a]/50 px-4 py-2 text-sm font-semibold text-[#e8b34a] sm:inline-flex">
                Sign in
              </Link>
              <Link href="/signup" className="rounded-lg bg-[#e8b34a] px-4 py-2 text-sm font-bold text-black">
                Join
              </Link>
            </>
          )}
        </div>
      </div>

      {/* mobile nav row */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-white/[0.05] px-4 py-2 no-scrollbar md:hidden">
        {[...LINKS, { href: "/showdown", label: "Showdown" }].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive(l.href) ? "bg-white/[0.06] text-white" : "text-white/55"
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
