"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Gavel, Loader2 } from "lucide-react";

const field =
  "w-full rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3.5 py-3 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const body =
      mode === "signup"
        ? {
            name: f.get("name"),
            handle: f.get("handle"),
            email: f.get("email"),
            password: f.get("password"),
          }
        : { email: f.get("email"), password: f.get("password") };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || "Something went wrong.");
      else {
        router.push(next);
        router.refresh();
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-gold-deep text-ink-950 shadow-glow-gold">
          <Gavel size={22} strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-2xl font-extrabold text-[#1a1408]">
          {mode === "signup" ? "Join the house" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-[#1a1408]/45">
          {mode === "signup" ? "Create an account to bid, watch and climb the boards." : "Sign in to keep bidding."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="panel flex flex-col gap-3 p-6">
        {mode === "signup" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="name" required maxLength={60} placeholder="Full name" className={field} autoComplete="name" />
              <input
                name="handle"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                title="3–30 letters, numbers or underscores"
                placeholder="@handle"
                className={field}
                autoComplete="username"
              />
            </div>
            <p className="-mt-1 text-xs text-[#1a1408]/35">
              Handle: 3–30 letters, numbers or underscores — this is your public @name.
            </p>
          </>
        )}
        <input name="email" type="email" required placeholder="you@email.com" className={field} autoComplete="email" />
        <div>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            maxLength={200}
            placeholder="Password"
            className={field}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signup" && <p className="mt-1 text-xs text-[#1a1408]/35">At least 6 characters.</p>}
        </div>

        {error && <p className="rounded-lg bg-ember/10 px-3 py-2 text-sm font-medium text-ember">{error}</p>}

        <button type="submit" disabled={busy} className="btn-gold mt-1">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />}
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[#1a1408]/45">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-gold hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Gavl?{" "}
            <Link href="/signup" className="font-semibold text-gold hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>

      {mode === "login" && (
        <p className="mt-4 rounded-xl border border-[#3c2d0f]/10 bg-[#3c2d0f]/[0.04] px-4 py-3 text-center text-xs text-[#1a1408]/40">
          Demo · <span className="num text-[#1a1408]/60">rhea@gavl.live</span> /{" "}
          <span className="num text-[#1a1408]/60">password123</span>
        </p>
      )}
    </div>
  );
}
