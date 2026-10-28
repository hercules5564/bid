"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";

const field =
  "w-full rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3.5 py-3 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none";

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const password = f.get("password");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || "Something went wrong.");
      else setDone(true);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ember/10 text-ember">
            <Lock size={22} strokeWidth={2.5} />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[#1a1408]">Missing reset token</h1>
          <p className="mt-1 text-sm text-[#1a1408]/45">
            Please use the reset link sent to your email.
          </p>
        </div>
        <Link href="/login" className="btn-gold inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-gold-deep text-ink-950 shadow-glow-gold">
            <Lock size={22} strokeWidth={2.5} />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[#1a1408]">Password reset</h1>
          <p className="mt-1 text-sm text-[#1a1408]/45">Your password has been updated.</p>
        </div>
        <Link href="/login" className="btn-gold inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-gold-deep text-ink-950 shadow-glow-gold">
          <Lock size={22} strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-2xl font-extrabold text-[#1a1408]">Reset password</h1>
        <p className="mt-1 text-sm text-[#1a1408]/45">
          Choose a new password for your account.
        </p>
      </div>

      <form onSubmit={onSubmit} className="panel flex flex-col gap-3 p-6">
        <input
          name="password"
          type="password"
          required
          minLength={6}
          maxLength={200}
          placeholder="New password"
          className={field}
          autoComplete="new-password"
        />

        {error && <p className="rounded-lg bg-ember/10 px-3 py-2 text-sm font-medium text-ember">{error}</p>}

        <button type="submit" disabled={busy} className="btn-gold mt-1">
          {busy ? "Resetting…" : "Reset password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#1a1408]/45">
        Remember your password?{" "}
        <Link href="/login" className="font-semibold text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
