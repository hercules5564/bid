import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { AppProviders } from "@/components/providers/AppProviders";
import { TopNav } from "@/components/nav/TopNav";
import { SiteFooter } from "@/components/nav/SiteFooter";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Gavl — live auction house", template: "%s · Gavl" },
  description:
    "Gavl is a real-time auction house. Live bids, flash lots, the Weekly Showdown, and leaderboards that play like a game.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const sessionUser = user
    ? { id: user.id, handle: user.handle, name: user.name, avatar: user.avatar, role: user.role }
    : null;

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <AppProviders initialUser={sessionUser}>
          <TopNav />
          <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6">{children}</main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
