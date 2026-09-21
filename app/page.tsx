"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  "Tech",
  "Startups",
  "AI",
  "Founders",
  "Indie Makers",
] as const;

type Category = (typeof CATEGORIES)[number];
type CategoryFilter = Category | "All" | "Trending";

const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000;

const CATEGORY_TABS: CategoryFilter[] = ["Trending", ...CATEGORIES, "All"];

type Podcast = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  url?: string | null;
  podcast_url?: string | null;
  website_url?: string | null;
  cover_image_url?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
};

type Bid = {
  id: string;
  podcast_id: string;
  amount: number | string | null;
  created_at?: string | null;
};

type RankedPodcast = {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  coverImage: string | null;
  totalBids: number;
  trendingBids: number;
};

function podcastName(podcast: Podcast) {
  return podcast.name?.trim() || podcast.title?.trim() || "Untitled podcast";
}

function podcastUrl(podcast: Podcast) {
  return (
    podcast.url?.trim() ||
    podcast.podcast_url?.trim() ||
    podcast.website_url?.trim() ||
    ""
  );
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

function bidTimestamp(bid: Bid) {
  if (!bid.created_at) return 0;
  const timestamp = Date.parse(bid.created_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
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
    return {
      badge: "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30",
      ring: "ring-amber-400/40",
      glow: "from-amber-400/15",
    };
  }
  if (rank === 2) {
    return {
      badge: "bg-slate-300 text-slate-950 shadow-lg shadow-slate-300/20",
      ring: "ring-slate-300/30",
      glow: "from-slate-300/10",
    };
  }
  if (rank === 3) {
    return {
      badge: "bg-orange-400 text-slate-950 shadow-lg shadow-orange-400/20",
      ring: "ring-orange-400/30",
      glow: "from-orange-400/10",
    };
  }
  return {
    badge: "bg-slate-800 text-emerald-300 ring-1 ring-slate-700",
    ring: "ring-slate-700/80",
    glow: "from-emerald-400/5",
  };
}

export default function Home() {
  const [podcasts, setPodcasts] = useState<RankedPodcast[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visiblePodcasts =
    selectedCategory === "Trending"
      ? [...podcasts].sort((a, b) => b.trendingBids - a.trendingBids)
      : selectedCategory === "All"
        ? podcasts
        : podcasts.filter((podcast) => podcast.category === selectedCategory);

  const leaderboardTitle =
    selectedCategory === "Trending"
      ? "Trending This Week"
      : selectedCategory === "All"
        ? "All Podcasts"
        : `${selectedCategory} Podcasts`;

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setLoading(true);
      setError(null);

      const trendingSince = new Date(
        Date.now() - TRENDING_WINDOW_MS
      ).toISOString();

      const [podcastsResult, bidsResult, trendingBidsResult] =
        await Promise.all([
          supabase.from("podcasts").select("*"),
          supabase.from("bids").select("*"),
          supabase
            .from("bids")
            .select("podcast_id, amount, created_at")
            .gte("created_at", trendingSince),
        ]);

      if (cancelled) return;

      if (podcastsResult.error || bidsResult.error) {
        setError(
          podcastsResult.error?.message ||
            bidsResult.error?.message ||
            "Unable to load the leaderboard."
        );
        setPodcasts([]);
        setLoading(false);
        return;
      }

      const totals = new Map<string, number>();
      for (const bid of (bidsResult.data ?? []) as Bid[]) {
        const current = totals.get(bid.podcast_id) ?? 0;
        totals.set(bid.podcast_id, current + Number(bid.amount ?? 0));
      }

      const trendingTotals = new Map<string, number>();
      const trendingBids = trendingBidsResult.error
        ? ((bidsResult.data ?? []) as Bid[]).filter(
            (bid) => bidTimestamp(bid) >= Date.now() - TRENDING_WINDOW_MS
          )
        : ((trendingBidsResult.data ?? []) as Bid[]);

      for (const bid of trendingBids) {
        const current = trendingTotals.get(bid.podcast_id) ?? 0;
        trendingTotals.set(bid.podcast_id, current + Number(bid.amount ?? 0));
      }

      const ranked = ((podcastsResult.data ?? []) as Podcast[])
        .map((podcast) => ({
          id: podcast.id,
          name: podcastName(podcast),
          description: podcast.description?.trim() || "No description yet.",
          category: podcast.category?.trim() || "",
          url: podcastUrl(podcast),
          coverImage: podcastCover(podcast),
          totalBids: totals.get(podcast.id) ?? 0,
          trendingBids: trendingTotals.get(podcast.id) ?? 0,
        }))
        .sort((a, b) => b.totalBids - a.totalBids);

      setPodcasts(ranked);
      setLoading(false);
    }

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
              Live leaderboard
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              RankPods
            </h1>
            <p className="mt-3 text-base text-slate-400 sm:text-lg">
              The leaderboard for tech &amp; startup podcasts
            </p>
          </div>

          <Link
            href="/submit"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            Submit Your Podcast
          </Link>
        </header>

        <div className="mb-6 flex flex-wrap gap-2 sm:mb-8">
          {CATEGORY_TABS.map((category) => {
            const isActive = category === selectedCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
                  isActive
                    ? "border-emerald-400/50 bg-emerald-400/15 font-bold text-emerald-200"
                    : "border-slate-700 bg-slate-900/60 font-medium text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-10 text-center">
            <p className="text-sm font-medium text-rose-200">
              Could not load podcasts
            </p>
            <p className="mt-2 text-sm text-rose-200/70">{error}</p>
          </div>
        ) : podcasts.length === 0 ? (
          <EmptyState />
        ) : (
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-white sm:mb-5 sm:text-2xl">
              {leaderboardTitle}
            </h2>
            {visiblePodcasts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-200">
                  {selectedCategory === "Trending"
                    ? "No trending podcasts yet"
                    : `No ${selectedCategory} podcasts yet`}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {selectedCategory === "Trending"
                    ? "Bids from the last 24 hours will appear here first."
                    : "Try another category, or submit a show to this one."}
                </p>
              </div>
            ) : (
              <ol className="flex flex-col gap-3 sm:gap-4">
                {visiblePodcasts.map((podcast, index) => (
                  <PodcastRow
                    key={podcast.id}
                    podcast={podcast}
                    rank={index + 1}
                  />
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function PodcastRow({
  podcast,
  rank,
}: {
  podcast: RankedPodcast;
  rank: number;
}) {
  const accent = rankAccent(rank);
  const content = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-12 sm:w-12 sm:text-base ${accent.badge}`}
      >
        #{rank}
      </div>

      {podcast.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={podcast.coverImage}
          alt={`${podcast.name} cover`}
          className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10 sm:h-20 sm:w-20"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl font-semibold text-emerald-300 ring-1 ring-white/10 sm:h-20 sm:w-20">
          {podcast.name.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
              {podcast.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">
              {podcast.description}
            </p>
          </div>
          <div className="shrink-0 sm:pl-4 sm:text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Total bids
            </p>
            <p className="text-lg font-semibold text-emerald-300 sm:text-xl">
              {formatUsd(podcast.totalBids)}
            </p>
          </div>
        </div>
        {podcast.url ? (
          <p className="mt-2 truncate text-xs text-emerald-400/80 sm:text-sm">
            Visit show →
          </p>
        ) : null}
      </div>
    </>
  );

  const className = `group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4 ring-1 transition hover:border-emerald-400/40 hover:bg-slate-900 sm:items-center sm:gap-5 sm:p-5 ${accent.ring}`;

  if (!podcast.url) {
    return <li className={className}>{content}</li>;
  }

  return (
    <li>
      <a
        href={podcast.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} cursor-pointer`}
      >
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r ${accent.glow} to-transparent opacity-80`}
        />
        {content}
      </a>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4" aria-live="polite">
      <p className="sr-only">Loading podcasts…</p>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5"
        >
          <div className="h-10 w-10 rounded-full bg-slate-800 sm:h-12 sm:w-12" />
          <div className="h-16 w-16 rounded-xl bg-slate-800 sm:h-20 sm:w-20" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-1/3 rounded bg-slate-800" />
            <div className="h-3 w-2/3 rounded bg-slate-800" />
          </div>
          <div className="hidden h-6 w-20 rounded bg-slate-800 sm:block" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl text-emerald-300">
        🎙️
      </div>
      <h2 className="text-xl font-semibold text-white">No podcasts yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
        The leaderboard is waiting for its first show. Submit a tech or startup
        podcast to claim the top spot.
      </p>
      <Link
        href="/submit"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
      >
        Submit Your Podcast
      </Link>
    </div>
  );
}
