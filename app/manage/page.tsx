"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function looksLikeEmail(value: string) {
  return value.includes("@");
}

function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

function normalizePodcastUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ManagePage() {
  const [identifier, setIdentifier] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(value: string): string | null {
    if (!value) {
      return "Enter your email or podcast URL.";
    }

    if (looksLikeEmail(value)) {
      return isValidEmail(value) ? null : "Enter a valid email address.";
    }

    const podcastUrl = normalizePodcastUrl(value);
    return isValidUrl(podcastUrl)
      ? null
      : "Enter a valid podcast URL starting with http:// or https://.";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const value = identifier.trim();
    const nextFieldError = validate(value);
    setFieldError(nextFieldError);
    if (nextFieldError) return;

    const payload = looksLikeEmail(value)
      ? { email: value.toLowerCase() }
      : { podcastUrl: normalizePodcastUrl(value) };

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean; message?: string }
        | null;

      if (!response.ok || !data?.success) {
        setFormError(
          data?.error || "Unable to send a magic link. Please try again."
        );
        return;
      }

      setSuccessMessage("Check your email for the magic link");
      setIdentifier("");
    } catch {
      setFormError("Unable to send a magic link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-emerald-300"
        >
          <span aria-hidden="true">←</span>
          Back to leaderboard
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-black/30 sm:p-12">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
            Creator access
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Manage your podcast
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Enter the email or podcast URL from your listing. We&apos;ll send a
            magic link to sign in to the creator dashboard.
          </p>

          {formError ? (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {formError}
            </div>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
            >
              {successMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="mt-8">
            <label
              htmlFor="identifier"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Your email or podcast URL
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="email"
              inputMode="email"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder="you@studio.com or https://example.com/podcast"
              disabled={submitting}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "identifier-error" : undefined}
              className={`w-full rounded-2xl border bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                fieldError
                  ? "border-rose-500/60 focus:border-rose-400 focus:ring-rose-400/30"
                  : "border-slate-700 focus:border-emerald-400/60 focus:ring-emerald-400/40"
              }`}
            />
            {fieldError ? (
              <p id="identifier-error" className="mt-2 text-sm text-rose-300">
                {fieldError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950"
                    aria-hidden="true"
                  />
                  <span>Sending magic link...</span>
                </>
              ) : (
                "Send magic link"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
