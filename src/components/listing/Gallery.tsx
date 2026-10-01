"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Gavel } from "lucide-react";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [];

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#3c2d0f]/15 bg-sand">
        {list[active] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={list[active]} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-[#1a1408]/15">
            <Gavel size={56} />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5" />
      </div>

      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {list.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border transition-all",
                i === active ? "border-gold ring-1 ring-gold/40" : "border-[#3c2d0f]/15 opacity-60 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
