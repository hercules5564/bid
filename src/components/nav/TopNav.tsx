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
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(l.href) ? "text-white" : "text-white/55 hover:text-white"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/showdown"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              isActive("/showdown") ? "text-gold" : "text-gold/80 hover:text-gold"
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
          className="ml-auto hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 lg:flex lg:w-64"
        >
          <Search size={15} className="text-white/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lots…"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
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
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">
                Sign in
              </Link>
              <Link href="/signup" className="btn-gold">
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
