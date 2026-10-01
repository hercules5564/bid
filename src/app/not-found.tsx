import Link from "next/link";
import { Gavel } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#3c2d0f]/15 bg-[#3c2d0f]/[0.05] text-[#1a1408]/30">
        <Gavel size={26} />
      </span>
      <h1 className="font-display text-5xl font-extrabold text-[#1a1408]">404</h1>
      <p className="mt-2 text-[#1a1408]/50">This lot has left the floor.</p>
      <Link href="/" className="btn-gold mt-6">
        Back to the house
      </Link>
    </div>
  );
}
