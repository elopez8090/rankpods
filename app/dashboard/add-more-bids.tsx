"use client";

import { FormEvent, useState } from "react";

export function AddMoreBids({
  podcastId,
  podcastName,
}: {
  podcastId: string;
  podcastName: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = Number(amount);
    if (!amount.trim() || !Number.isFinite(parsed) || parsed < 5) {
      setError("Minimum bid is $5.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/bids/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          podcastId,
          amount: parsed,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; url?: string; checkoutUrl?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error || "Unable to start checkout. Please try again."
        );
      }

      const checkoutUrl = payload?.url || payload?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("Checkout did not return a payment URL.");
      }

      window.location.href = checkoutUrl;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:w-auto"
        >
          Add More Bids
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/30 ring-1 ring-slate-700/80 sm:p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Add more bids</h2>
              <p className="mt-1 text-sm text-slate-400">
                Place another bid for {podcastName}. Minimum $5.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (submitting) return;
                setOpen(false);
                setError(null);
              }}
              className="rounded-full px-3 py-1 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Close
            </button>
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          ) : null}

          <label htmlFor="additional-bid" className="text-sm font-medium text-slate-200">
            Bid amount
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-slate-500">
              $
            </span>
            <input
              id="additional-bid"
              name="amount"
              type="number"
              inputMode="decimal"
              min={5}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="5.00"
              disabled={submitting}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 py-3 pl-8 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950" />
                Redirecting to checkout…
              </span>
            ) : (
              "Continue to checkout"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
