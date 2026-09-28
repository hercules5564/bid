"use client";
import { SessionProvider, type SessionUser } from "./session";
import { ToastProvider } from "./toast";
import { NotificationsProvider } from "./notifications";

export function AppProviders({
  initialUser,
  children,
}: {
  initialUser: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider user={initialUser}>
      <ToastProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
