"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";

const CATEGORIES = [
  "Tech",
  "Startups",
  "AI",
  "Founders",
  "Indie Makers",
] as const;

type Category = (typeof CATEGORIES)[number];

type FormValues = {
  name: string;
  category: Category;
  url: string;
  email: string;
  amount: string;
  description: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  name: "",
  category: "Tech",
  url: "",
  email: "",
  amount: "",
  description: "",
};

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  const url = values.url.trim();
  const email = values.email.trim();
  const amount = Number(values.amount);

  if (!name) {
    errors.name = "Podcast name is required.";
  }

  if (!values.category.trim()) {
    errors.category = "Category is required.";
  } else if (!CATEGORIES.includes(values.category as Category)) {
    errors.category = "Select a valid category.";
  }

  if (!url) {
    errors.url = "Podcast URL is required.";
  } else if (!isValidUrl(url)) {
    errors.url = "Enter a valid URL starting with http:// or https://.";
  }

  if (!email) {
    errors.email = "Creator email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.amount.trim()) {
    errors.amount = "Initial bid amount is required.";
  } else if (!Number.isFinite(amount) || amount < 5) {
    errors.amount = "Minimum bid is $5.";
  }

  return errors;
}

export default function SubmitPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/bids/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          category: values.category,
          url: values.url.trim(),
          email: values.email.trim(),
          amount: Number(values.amount),
          description: values.description.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            message?: string;
            url?: string;
            checkoutUrl?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            "Unable to start checkout. Please try again."
        );
      }

      const checkoutUrl = payload?.url || payload?.checkoutUrl;
      if (checkoutUrl) {
        setSuccessMessage("Redirecting to checkout…");
        window.location.href = checkoutUrl;
        return;
      }

      setSuccessMessage(
        payload?.message ||
          "Your podcast was submitted. Complete checkout to place your bid."
      );
      setValues(initialValues);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
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

      <div className="relative mx-auto flex w-full max-w-2xl flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-emerald-300"
        >
          <span aria-hidden="true">←</span>
          Back to leaderboard
        </Link>

        <header className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
            New listing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Submit Your Podcast
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-400 sm:text-lg">
            Claim a spot on the RankPods leaderboard. Your initial bid starts at
            $5 and goes live after checkout.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/30 ring-1 ring-slate-700/80 sm:p-8"
        >
          {formError ? (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {formError}
            </div>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
            >
              {successMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-5">
            <Field
              id="name"
              label="Podcast Name"
              required
              error={errors.name}
            >
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="organization"
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="The Launchpad"
                disabled={submitting}
                className={inputClass(Boolean(errors.name))}
              />
            </Field>

            <Field
              id="category"
              label="Category"
              required
              error={errors.category}
            >
              <select
                id="category"
                name="category"
                value={values.category}
                onChange={(event) =>
                  updateField("category", event.target.value as Category)
                }
                disabled={submitting}
                className={inputClass(Boolean(errors.category))}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="url"
              label="Podcast URL"
              required
              error={errors.url}
            >
              <input
                id="url"
                name="url"
                type="url"
                inputMode="url"
                autoComplete="url"
                value={values.url}
                onChange={(event) => updateField("url", event.target.value)}
                placeholder="https://example.com/podcast"
                disabled={submitting}
                className={inputClass(Boolean(errors.url))}
              />
            </Field>

            <Field
              id="email"
              label="Creator Email"
              required
              error={errors.email}
            >
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@studio.com"
                disabled={submitting}
                className={inputClass(Boolean(errors.email))}
              />
            </Field>

            <Field
              id="amount"
              label="Initial Bid Amount"
              required
              hint="Minimum $5"
              error={errors.amount}
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-slate-500">
                  $
                </span>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  min={5}
                  step="0.01"
                  value={values.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                  placeholder="5.00"
                  disabled={submitting}
                  className={`${inputClass(Boolean(errors.amount))} pl-8`}
                />
              </div>
            </Field>

            <Field
              id="description"
              label="Description"
              hint="Optional"
              error={errors.description}
            >
              <textarea
                id="description"
                name="description"
                rows={4}
                value={values.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="What should listeners know about this show?"
                disabled={submitting}
                className={`${inputClass(Boolean(errors.description))} resize-y min-h-28`}
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950" />
                Processing…
              </span>
            ) : (
              "Continue to checkout"
            )}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            You’ll be sent to a secure checkout to confirm your bid.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-200">
          {label}
          {required ? <span className="ml-1 text-emerald-300">*</span> : null}
        </label>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="mt-2 text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    "w-full rounded-2xl border bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition",
    "focus:ring-2 focus:ring-emerald-400/40",
    "disabled:cursor-not-allowed disabled:opacity-60",
    hasError
      ? "border-rose-500/60 focus:border-rose-400"
      : "border-slate-700 focus:border-emerald-400/60",
  ].join(" ");
}
