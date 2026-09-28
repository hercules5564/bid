"use client";
import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket-client";

export function useSocket(): Socket {
  return getSocket();
}

/** Subscribe to a socket event for the lifetime of the component. */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = getSocket();
    const cb = (p: T) => ref.current(p);
    s.on(event, cb);
    return () => {
      s.off(event, cb);
    };
  }, [event]);
}

/** Join a room on mount, leave on unmount. */
export function useRoom(joinEvent: string, leaveEvent: string, arg?: string) {
  useEffect(() => {
    const s = getSocket();
    const join = () => s.emit(joinEvent, arg);
    join();
    s.on("connect", join);
    return () => {
      s.off("connect", join);
      s.emit(leaveEvent, arg);
    };
  }, [joinEvent, leaveEvent, arg]);
}
