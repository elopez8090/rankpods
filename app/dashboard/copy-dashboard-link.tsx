"use client";

import { useState } from "react";

export function CopyDashboardLink() {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    setError(null);
    setCopying(true);

    try {
      const url = window.location.origin + "/dashboard";
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? copyError.message
          : "Unable to copy link. Clipboard access may be denied."
      );
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleCopy}
        disabled={copying}
        className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {copied ? "Copied!" : "Copy dashboard link"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 max-w-[12rem] text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
