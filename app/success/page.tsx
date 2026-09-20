"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Podcast = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  podcast_url?: string | null;
  website_url?: string | null;
  cover_image_url?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
};

type Bid = {
  podcast_id: string;
  amount: number | string | null;
};

type SuccessPodcast = {
  id: string;
  name: string;
  coverImage: string | null;
  totalBids: number;
  rank: number;
};

function podcastName(podcast: Podcast) {
  return podcast.name?.trim() || podcast.title?.trim() || "Untitled podcast";
}

function podcastCover(podcast: Podcast) {
  return (
    podcast.cover_image_url?.trim() ||
    podcast.cover_image?.trim() ||
    podcast.image_url?.trim() ||
    podcast.cover_url?.trim() ||
    null
  );
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
}

function rankAccent(rank: number) {
  if (rank === 1) {
    return "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30";
  }
  if (rank === 2) {
    return "bg-slate-300 text-slate-950 shadow-lg shadow-slate-300/20";
  }
  if (rank === 3) {
    return "bg-orange-400 text-slate-950 shadow-lg shadow-orange-400/20";
  }
  return "bg-slate-800 text-emerald-300 ring-1 ring-slate-700";
}

function calculateRank(
  podcastId: string,
  totals: Map<string, number>,
  allPodcastIds: string[]
) {
  const ranked = allPodcastIds
    .map((id) => ({ id, total: totals.get(id) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const index = ranked.findIndex((item) => item.id === podcastId);
  return index === -1 ? ranked.length + 1 : index + 1;
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessShell><LoadingState /></SuccessShell>}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const podcastId = searchParams.get("podcast_id")?.trim() || "";

  const [podcast, setPodcast] = useState<SuccessPodcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPodcast() {
      setLoading(true);
      setError(null);
      setPodcast(null);

      if (!podcastId) {
        setError("Podcast not found");
        setLoading(false);
        return;
      }

      const [podcastResult, podcastsResult, bidsResult] = await Promise.all([
        supabase.from("podcasts").select("*").eq("id", podcastId).maybeSingle(),
        supabase.from("podcasts").select("id"),
        supabase.from("bids").select("podcast_id, amount"),
      ]);

      if (cancelled) return;

      if (podcastResult.error || podcastsResult.error || bidsResult.error) {
        setError(
          podcastResult.error?.message ||
            podcastsResult.error?.message ||
            bidsResult.error?.message ||
            "Unable to load this podcast."
        );
        setLoading(false);
        return;
      }

      const row = podcastResult.data as Podcast | null;
      if (!row) {
        setError("Podcast not found");
        setLoading(false);
        return;
      }

      const totals = new Map<string, number>();
      for (const bid of (bidsResult.data ?? []) as Bid[]) {
        totals.set(
          bid.podcast_id,
          (totals.get(bid.podcast_id) ?? 0) + Number(bid.amount ?? 0)
        );
      }

      const allIds = ((podcastsResult.data ?? []) as { id: string }[]).map(
        (item) => item.id
      );
      if (!allIds.includes(row.id)) {
        allIds.push(row.id);
      }

      setPodcast({
        id: row.id,
        name: podcastName(row),
        coverImage: podcastCover(row),
        totalBids: totals.get(row.id) ?? 0,
        rank: calculateRank(row.id, totals, allIds),
      });
      setLoading(false);
    }

    loadPodcast();

    return () => {
      cancelled = true;
    };
  }, [podcastId]);

  return (
    <SuccessShell>
      {loading ? (
        <LoadingState />
      ) : error || !podcast ? (
        <ErrorState message={error || "Podcast not found"} />
      ) : (
        <SuccessCard podcast={podcast} />
      )}
    </SuccessShell>
  );
}

function SuccessShell({ children }: { children: ReactNode }) {
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

function SuccessCard({ podcast }: { podcast: SuccessPodcast }) {
  return (
    <div className="relative">
      <Confetti />
      <div className="success-pop rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-2xl shadow-black/30 ring-1 ring-emerald-400/20 sm:p-10">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          Checkout complete
        </p>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-3xl text-slate-950 shadow-lg shadow-emerald-400/30">
          ✓
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Payment Successful!
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Your podcast is now live on the leaderboard!
        </p>

        <div className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          {podcast.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={podcast.coverImage}
              alt={`${podcast.name} cover`}
              className="h-24 w-24 rounded-2xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-800 text-3xl font-semibold text-emerald-300 ring-1 ring-white/10">
              {podcast.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-white">{podcast.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatUsd(podcast.totalBids)} in bids
            </p>
          </div>
          <div
            className={`flex h-12 min-w-12 items-center justify-center rounded-full px-4 text-sm font-bold ${rankAccent(podcast.rank)}`}
          >
            Rank #{podcast.rank}
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          View Leaderboard
        </Link>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10"
      aria-live="polite"
    >
      <p className="sr-only">Loading podcast…</p>
      <div className="flex animate-pulse flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-slate-800" />
        <div className="h-8 w-56 rounded bg-slate-800" />
        <div className="h-4 w-72 rounded bg-slate-800" />
        <div className="mt-4 h-24 w-24 rounded-2xl bg-slate-800" />
        <div className="h-5 w-40 rounded bg-slate-800" />
        <div className="h-10 w-24 rounded-full bg-slate-800" />
        <div className="mt-4 h-12 w-44 rounded-full bg-slate-800" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const notFound = message.toLowerCase().includes("not found");

  return (
    <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-6 py-14 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-2xl">
        {notFound ? "🎙️" : "!"}
      </div>
      <h1 className="text-2xl font-semibold text-white">
        {notFound ? "Podcast not found" : "Could not load podcast"}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-200/80">
        {notFound
          ? "We couldn’t find a listing for this payment. If you just checked out, the listing may still be processing."
          : message}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
      >
        View Leaderboard
      </Link>
    </div>
  );
}

function Confetti() {
  const pieces = [
    { left: "8%", delay: "0s", duration: "2.4s", color: "bg-emerald-400" },
    { left: "18%", delay: "0.15s", duration: "2.8s", color: "bg-cyan-400" },
    { left: "28%", delay: "0.4s", duration: "2.2s", color: "bg-amber-300" },
    { left: "38%", delay: "0.08s", duration: "3s", color: "bg-white" },
    { left: "48%", delay: "0.3s", duration: "2.5s", color: "bg-emerald-300" },
    { left: "58%", delay: "0.5s", duration: "2.7s", color: "bg-orange-400" },
    { left: "68%", delay: "0.12s", duration: "2.3s", color: "bg-cyan-300" },
    { left: "78%", delay: "0.35s", duration: "2.9s", color: "bg-emerald-400" },
    { left: "88%", delay: "0.22s", duration: "2.6s", color: "bg-amber-400" },
    { left: "14%", delay: "0.6s", duration: "2.1s", color: "bg-slate-200" },
    { left: "72%", delay: "0.7s", duration: "2.4s", color: "bg-emerald-200" },
    { left: "92%", delay: "0.18s", duration: "2.8s", color: "bg-cyan-200" },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 -top-4 z-10 h-64 overflow-hidden">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className={`absolute top-0 h-2 w-2 rounded-sm ${piece.color} confetti-piece`}
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
          }}
        />
      ))}
    </div>
  );
}
