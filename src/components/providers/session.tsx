"use client";
import { createContext, useContext } from "react";

export type SessionUser = {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  role: string;
} | null;

const SessionContext = createContext<SessionUser>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  return useContext(SessionContext);
}
