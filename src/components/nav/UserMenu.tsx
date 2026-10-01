"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, UserRound, PlusSquare, LogOut, ChevronDown, ReceiptText } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useSession } from "@/components/providers/session";

export function UserMenu() {
  const user = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const items = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
    { href: "/orders", label: "Orders", icon: <ReceiptText size={15} /> },
    { href: `/u/${user.handle}`, label: "My profile", icon: <UserRound size={15} /> },
    ...(user.role === "ADMIN" || user.role === "SELLER"
      ? [{ href: "/admin", label: "List an item", icon: <PlusSquare size={15} /> }]
      : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-1 pl-1 pr-2 transition-all duration-200 hover:border-gold/30 hover:bg-white/[0.07] hover:shadow-glow-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
      >
        <Avatar src={user.avatar} name={user.name} size="sm" />
        <ChevronDown
          size={14}
          className={`text-white/40 transition-transform duration-200 ${open ? "rotate-180 text-gold" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{ transformOrigin: "top right" }}
            className="panel absolute right-0 z-50 mt-2 w-60 overflow-hidden p-1.5 shadow-[0_24px_60px_-20px_rgba(60,45,15,0.45)]"
          >
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar src={user.avatar} name={user.name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1a1408]">{user.name}</p>
                <p className="truncate text-xs text-[#1a1408]/50">@{user.handle}</p>
              </div>
            </div>
            <div className="my-1 border-t border-[#3c2d0f]/10" />
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[#1a1408]/80 transition-colors duration-200 hover:bg-gold/10 hover:text-[#1a1408] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              >
                <span className="text-[#1a1408]/45">{it.icon}</span>
                {it.label}
              </Link>
            ))}
            <div className="my-1 border-t border-[#3c2d0f]/10" />
            <button
              onClick={logout}
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ember/90 transition-colors duration-200 hover:bg-ember/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
            >
              <LogOut size={15} />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
