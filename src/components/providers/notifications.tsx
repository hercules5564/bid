"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import { SocketEvent } from "@/lib/events";
import type { NotificationItem } from "@/types";
import { useSession } from "./session";
import { useToast } from "./toast";

type NotifCtx = {
  items: NotificationItem[];
  unread: number;
  refresh: () => void;
  markAll: () => void;
  markOne: (id: string) => void;
};

const Ctx = createContext<NotifCtx>({
  items: [],
  unread: 0,
  refresh: () => {},
  markAll: () => {},
  markOne: () => {},
});

const toneFor: Record<string, "gold" | "arc" | "ember" | "mint"> = {
  OUTBID: "ember",
  WON: "gold",
  LOST: "arc",
  ENDING_SOON: "ember",
  SHOWDOWN_STARTING: "gold",
  BID_PLACED: "mint",
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const user = useSession();
  const toast = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!user) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setItems(d.items);
          setUnread(d.unread);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const s = getSocket();
    // Re-join the user room AND re-pull persisted state on every (re)connect, so
    // notifications delivered while the socket was down aren't missed.
    const onConnect = () => {
      s.emit(SocketEvent.JoinUser, user.id);
      refresh();
    };
    if (s.connected) onConnect();
    s.on("connect", onConnect);

    const onNotify = (n: NotificationItem) => {
      setItems((cur) => [{ ...n, read: false }, ...cur].slice(0, 40));
      setUnread((u) => u + 1);
      toast({ title: n.title, body: n.body, tone: toneFor[n.type] ?? "gold" });
    };
    s.on(SocketEvent.Notify, onNotify);

    return () => {
      s.off("connect", onConnect);
      s.off(SocketEvent.Notify, onNotify);
    };
  }, [user, refresh, toast]);

  const markAll = useCallback(() => {
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    setUnread(0);
    fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
  }, []);

  const markOne = useCallback((id: string) => {
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  return <Ctx.Provider value={{ items, unread, refresh, markAll, markOne }}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  return useContext(Ctx);
}
