import { DURATION_MS } from "./config";

export type DurationType = "HOURLY" | "DAILY" | "WEEKLY" | "WEEKLY_SHOWDOWN";

export function computeEndsAt(type: DurationType, startsAt: Date, hoursOverride?: number): Date {
  const ms = hoursOverride && type === "HOURLY" ? hoursOverride * 60 * 60 * 1000 : DURATION_MS[type];
  return new Date(startsAt.getTime() + ms);
}

export const DURATION_META: Record<DurationType, { label: string; short: string; tone: string }> = {
  HOURLY: { label: "Flash", short: "FLASH", tone: "ember" },
  DAILY: { label: "Daily", short: "24H", tone: "arc" },
  WEEKLY: { label: "Weekly", short: "7D", tone: "gold" },
  WEEKLY_SHOWDOWN: { label: "Weekly Showdown", short: "SHOWDOWN", tone: "gold" },
};

/** ms remaining until a target time (never negative). */
export function msLeft(endsAt: Date | string | number, now = Date.now()): number {
  const t = typeof endsAt === "number" ? endsAt : new Date(endsAt).getTime();
  return Math.max(0, t - now);
}

/** "3d 04h", "05:12:44", "00:42" — scales the granularity to the magnitude. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
