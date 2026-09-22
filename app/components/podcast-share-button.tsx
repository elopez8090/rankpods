"use client";

import { useState } from "react";

type PodcastShareButtonProps = {
  podcastName: string;
  podcastUrl: string;
};

export function PodcastShareButton({
  podcastName,
  podcastUrl,
}: PodcastShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareText = `Check out ${podcastName} on RankPods - ${podcastUrl}`;
  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  async function handleCopy() {
    setError(null);

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? copyError.message
          : "Unable to copy. Clipboard access may be denied."
      );
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-sm text-emerald-300 hover:text-emerald-200"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm text-emerald-300 hover:text-emerald-200"
        >
          Share
        </a>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
