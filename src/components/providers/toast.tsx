"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Zap, Gavel, Bell, X } from "lucide-react";

type Tone = "gold" | "arc" | "ember" | "mint";
export type ToastInput = { title: string; body?: string; tone?: Tone; icon?: React.ReactNode };
type Toast = ToastInput & { id: number };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

let counter = 0;

const toneRing: Record<Tone, string> = {
  gold: "border-gold/40 shadow-glow-gold",
  arc: "border-arc/40 shadow-glow-arc",
  ember: "border-ember/40 shadow-glow-ember",
  mint: "border-mint/40",
};
const toneIcon: Record<Tone, React.ReactNode> = {
  gold: <Trophy size={16} className="text-gold" />,
  arc: <Gavel size={16} className="text-arc-soft" />,
  ember: <Zap size={16} className="text-ember" />,
  mint: <Bell size={16} className="text-mint" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: ToastInput) => {
    const id = ++counter;
    setToasts((cur) => [...cur, { ...t, id }].slice(-4));
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 5200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-ink-850/95 px-4 py-3 backdrop-blur-xl ${toneRing[t.tone ?? "gold"]}`}
            >
              <span className="mt-0.5 shrink-0">{t.icon ?? toneIcon[t.tone ?? "gold"]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs leading-snug text-white/55">{t.body}</p>}
              </div>
              <button
                onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
                className="shrink-0 text-white/30 transition-colors hover:text-white/70"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
