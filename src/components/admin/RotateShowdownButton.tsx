"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/toast";

export function RotateShowdownButton() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function rotate() {
    if (!window.confirm("Force-close the current Showdown and promote the priciest lot?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/showdown", { method: "POST" }).then((r) => r.json());
      if (res.rotated) toast({ title: "Showdown rotated", body: res.title, tone: "gold" });
      else toast({ title: "No eligible lot to promote", tone: "ember" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={rotate} disabled={busy} className="btn-ghost border-gold/30 text-gold hover:bg-gold/10">
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Swords size={15} />}
      Rotate Showdown now
    </button>
  );
}
