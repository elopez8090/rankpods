"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setError(null);
    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to log out. Please try again.");
      }

      window.location.href = "/";
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Unable to log out. Please try again."
      );
      setLoggingOut(false);
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 max-w-[12rem] text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
