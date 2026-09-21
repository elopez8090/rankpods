"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <VerifyShell>
          <VerifyLoading />
        </VerifyShell>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyToken() {
      if (!token) {
        setError("This magic link is missing a token.");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ token }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; success?: boolean }
          | null;

        if (cancelled) return;

        if (!response.ok || !payload?.success) {
          setError(
            payload?.error || "Link expired or invalid. Request a new magic link."
          );
          return;
        }

        router.push("/dashboard");
      } catch {
        if (cancelled) return;
        setError("Unable to verify this magic link. Please try again.");
      }
    }

    void verifyToken();

    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <VerifyShell>
      {error ? <VerifyError message={error} /> : <VerifyLoading />}
    </VerifyShell>
  );
}

function VerifyShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_45%)]" />
      </div>
      <div className="relative mx-auto flex w-full max-w-lg flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

function VerifyLoading() {
  return (
    <div
      className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl shadow-black/30 sm:p-12"
      aria-live="polite"
      role="status"
    >
      <span className="mx-auto mb-6 flex h-12 w-12 items-center justify-center">
        <span className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-400/20 border-t-emerald-400" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Verifying your magic link...
      </h1>
      <p className="mt-3 text-sm text-slate-400">
        Hang tight while we sign you in to the creator dashboard.
      </p>
    </div>
  );
}

function VerifyError({ message }: { message: string }) {
  return (
    <div
      className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-6 py-14 text-center"
      role="alert"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-2xl">
        !
      </div>
      <h1 className="text-2xl font-semibold text-white">Could not verify link</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-200/80">
        {message}
      </p>
      <Link
        href="/submit"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
      >
        Back to submit
      </Link>
    </div>
  );
}
