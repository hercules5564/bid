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
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
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
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-1 pl-1 pr-2 transition-colors hover:bg-white/[0.07]"
      >
        <Avatar src={user.avatar} name={user.name} size="sm" />
        <ChevronDown size={14} className="text-white/40" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="panel absolute right-0 z-50 mt-2 w-56 overflow-hidden p-1.5"
          >
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar src={user.avatar} name={user.name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-white/40">@{user.handle}</p>
              </div>
            </div>
            <div className="my-1 border-t border-white/[0.06]" />
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {it.icon}
                {it.label}
              </Link>
            ))}
            <div className="my-1 border-t border-white/[0.06]" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ember/90 transition-colors hover:bg-ember/10"
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
