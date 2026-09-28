import Link from "next/link";
import { Gavel } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-gold-soft to-gold-deep text-ink-950 shadow-glow-gold transition-transform group-hover:-rotate-6">
        <Gavel size={18} strokeWidth={2.5} />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-white">
        Gavl<span className="text-gold">.</span>
      </span>
    </Link>
  );
}
