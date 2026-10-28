"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";

const field =
  "w-full rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3.5 py-3 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const email = f.get("email");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || "Something went wrong.");
      else {
        setDone(true);
        setResetToken(data.token ?? null);
        setResetUrl(data.resetUrl ?? null);
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto mt-10 max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-gold-deep text-ink-950 shadow-glow-gold">
            <Mail size={22} strokeWidth={2.5} />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[#1a1408]">Reset link ready</h1>
          <p className="mt-1 text-sm text-[#1a1408]/45">
            Copy the token below and open the reset URL to set a new password.
          </p>
        </div>

        {resetUrl && (
          <div className="mb-4 rounded-xl border border-[#3c2d0f]/15 bg-white/70 p-4">
            <div className="text-xs font-semibold text-[#1a1408]/50 uppercase tracking-wide mb-1">Reset URL</div>
            <input
              readOnly
              value={resetUrl}
              className="w-full text-sm text-[#1a1408] bg-transparent border-none focus:ring-0"
            />
          </div>
        )}
        {resetToken && (
          <div className="rounded-xl border border-[#3c2d0f]/15 bg-white/70 p-4">
            <div className="text-xs font-semibold text-[#1a1408]/50 uppercase tracking-wide mb-1">Token</div>
            <input
              readOnly
              value={resetToken}
              className="w-full text-sm text-[#1a1408] bg-transparent border-none focus:ring-0"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`/reset-password?token=${resetToken ?? ""}`}
            className="btn-gold inline-flex items-center justify-center gap-2"
          >
            Open reset page
          </Link>
          <Link href="/login" className="btn-ghost inline-flex items-center justify-center gap-2 border-[#3c2d0f]/15">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-gold-deep text-ink-950 shadow-glow-gold">
          <Mail size={22} strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-2xl font-extrabold text-[#1a1408]">Forgot password</h1>
        <p className="mt-1 text-sm text-[#1a1408]/45">
          Enter your email and we’ll send a reset link.
        </p>
      </div>

      <form onSubmit={onSubmit} className="panel flex flex-col gap-3 p-6">
        <input
          name="email"
          type="email"
          required
          placeholder="you@email.com"
          className={field}
          autoComplete="email"
        />

        {error && <p className="rounded-lg bg-ember/10 px-3 py-2 text-sm font-medium text-ember">{error}</p>}

        <button type="submit" disabled={busy} className="btn-gold mt-1">
          {busy ? "Sending…" : "Send reset link"}
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
