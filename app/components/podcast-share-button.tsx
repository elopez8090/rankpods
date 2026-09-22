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
    <div className="flex flex-col gap-1">
      <div className="inline-flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="text-sm text-emerald-300 hover:text-emerald-200"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-emerald-300 hover:text-emerald-200"
        >
          Share on X
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
