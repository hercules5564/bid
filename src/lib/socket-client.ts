"use client";
import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;

/** One shared socket connection for the whole tab. */
export function getSocket(): Socket {
  if (!socket) {
    // Same-origin by default (works on any port). Only use an explicit URL when
    // the socket server is deliberately hosted on a different origin.
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    const sameOrigin = !url || (typeof window !== "undefined" && url.startsWith(window.location.origin));
    socket = io(sameOrigin ? undefined : url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 800,
      withCredentials: true,
    });
  }
  return socket;
}
