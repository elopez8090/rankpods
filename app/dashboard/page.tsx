import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CREATOR_SESSION_COOKIE,
  parseCreatorSessionCookie,
} from "@/lib/creator-auth";
import { supabase } from "@/lib/supabase";
import { AddMoreBids } from "./add-more-bids";
import { CopyDashboardLink } from "./copy-dashboard-link";
import { LogoutButton } from "./logout-button";

type PodcastRow = {
  id: string;
  name: string | null;
  cover_image_url: string | null;
  podcast_url: string | null;
};

type BidAmountRow = {
  podcast_id: string;
  amount: number | string | null;
};

type BidHistoryRow = {
  amount: number | string | null;
  created_at: string | null;
};

type HistoryItem = {
  amount: number;
  createdAt: string | null;
  runningTotal: number;
};

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatBidDate(value: string | null) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown date";

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${datePart} at ${timePart}`;
}

function medalForRank(rank: number) {
  if (rank === 1) {
    return {
      label: "Gold",
      emoji: "🥇",
      className: "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30",
    };
  }
  if (rank === 2) {
    return {
      label: "Silver",
      emoji: "🥈",
      className: "bg-slate-300 text-slate-950 shadow-lg shadow-slate-300/20",
    };
  }
  if (rank === 3) {
    return {
      label: "Bronze",
      emoji: "🥉",
      className: "bg-orange-400 text-slate-950 shadow-lg shadow-orange-400/20",
    };
  }
  return null;
}

function calculateRank(podcastId: string, totals: Map<string, number>, ids: string[]) {
  const ranked = ids
    .map((id) => ({ id, total: totals.get(id) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const index = ranked.findIndex((item) => item.id === podcastId);
  return index === -1 ? ranked.length + 1 : index + 1;
}

function runningTotalsNewestFirst(rows: BidHistoryRow[]): HistoryItem[] {
  const chronological = [...rows].reverse();
  let running = 0;
  const withTotals = chronological.map((row) => {
    const amount = Number(row.amount ?? 0);
    running += Number.isFinite(amount) ? amount : 0;
    return {
      amount: Number.isFinite(amount) ? amount : 0,
      createdAt: row.created_at,
      runningTotal: running,
    };
  });

  return withTotals.reverse();
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = parseCreatorSessionCookie(
    cookieStore.get(CREATOR_SESSION_COOKIE)?.value
  );

  if (!session) {
    redirect(
      `/submit?error=${encodeURIComponent(
        "Please sign in with your magic link to view the creator dashboard."
      )}`
    );
  }

  const [podcastResult, allPodcastsResult, allBidsResult, historyResult] =
    await Promise.all([
      supabase
        .from("podcasts")
        .select("id, name, cover_image_url, podcast_url")
        .eq("id", session.podcastId)
        .maybeSingle(),
      supabase.from("podcasts").select("id"),
      supabase.from("bids").select("podcast_id, amount"),
      supabase
        .from("bids")
        .select("amount, created_at")
        .eq("podcast_id", session.podcastId)
        .order("created_at", { ascending: false }),
    ]);

  if (
    podcastResult.error ||
    allPodcastsResult.error ||
    allBidsResult.error ||
    historyResult.error
  ) {
    const message =
      podcastResult.error?.message ||
      allPodcastsResult.error?.message ||
      allBidsResult.error?.message ||
      historyResult.error?.message ||
      "Unable to load the creator dashboard.";

    return <DashboardError message={message} />;
  }

  const podcast = podcastResult.data as PodcastRow | null;
  if (!podcast) {
    return <DashboardError message="We could not find this podcast." />;
  }

  const totals = new Map<string, number>();
  for (const bid of (allBidsResult.data ?? []) as BidAmountRow[]) {
    totals.set(
      bid.podcast_id,
      (totals.get(bid.podcast_id) ?? 0) + Number(bid.amount ?? 0)
    );
  }

  const allIds = ((allPodcastsResult.data ?? []) as { id: string }[]).map(
    (row) => row.id
  );
  if (!allIds.includes(podcast.id)) {
    allIds.push(podcast.id);
  }

  const historyRows = (historyResult.data ?? []) as BidHistoryRow[];
  const history = runningTotalsNewestFirst(historyRows);
  const totalBids = totals.get(podcast.id) ?? 0;
  const rank = calculateRank(podcast.id, totals, allIds);
  const medal = medalForRank(rank);
  const name = podcast.name?.trim() || "Untitled podcast";
  const cover = podcast.cover_image_url?.trim() || null;
  const url = podcast.podcast_url?.trim() || "";

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-emerald-300"
        >
          <span aria-hidden="true">←</span>
          Back to leaderboard
        </Link>

        <header className="mb-8 grid gap-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/30 ring-1 ring-slate-700/80 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={`${name} cover`}
              className="h-24 w-24 rounded-2xl object-cover ring-1 ring-white/10 sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-800 text-3xl font-semibold text-emerald-300 ring-1 ring-white/10 sm:h-28 sm:w-28">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
                Creator dashboard
              </p>
              <LogoutButton />
            </div>
            <h1 className="truncate text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {name}
            </h1>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block truncate text-sm text-emerald-300 transition hover:text-emerald-200"
              >
                {url}
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No podcast URL on file.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">{session.email}</p>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          <article className="rounded-2xl border border-emerald-400/20 bg-slate-900/70 p-4 ring-1 ring-emerald-400/15 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Total Bids
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300 sm:text-3xl">
              {formatUsd(totalBids)}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Current Rank
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-2xl font-semibold text-white sm:text-3xl">#{rank}</p>
              {medal ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${medal.className}`}
                >
                  <span aria-hidden="true">{medal.emoji}</span>
                  {medal.label}
                </span>
              ) : null}
            </div>
          </article>

          <article className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 lg:col-span-1 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Bids Placed
            </p>
            <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {history.length}
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/30 ring-1 ring-slate-700/80 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Bid history
            </h2>
            <CopyDashboardLink />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Newest bids first, with a running total after each bid.
          </p>

          {history.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-10 text-center text-sm text-slate-400">
              No bids yet. Place your first additional bid below.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Running Total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((bid, index) => (
                    <tr
                      key={`${bid.createdAt ?? "unknown"}-${index}`}
                      className="border-b border-slate-800/80 last:border-0"
                    >
                      <td className="py-3 pr-4 text-slate-300">
                        {formatBidDate(bid.createdAt)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-white">
                        {formatUsd(bid.amount)}
                      </td>
                      <td className="py-3 font-medium text-emerald-300">
                        {formatUsd(bid.runningTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddMoreBids podcastId={podcast.id} podcastName={name} />
        </section>
      </div>
    </div>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>
      <div className="relative mx-auto flex w-full max-w-lg flex-col px-4 pb-16 pt-20 sm:px-6">
        <div
          className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-6 py-14 text-center"
          role="alert"
        >
          <h1 className="text-2xl font-semibold text-white">
            Could not load dashboard
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-200/80">
            {message}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Back to leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
