export default function DashboardLoading() {
  return (
    <div className="relative min-h-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex gap-4">
            <div className="h-24 w-24 rounded-2xl bg-slate-800" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-6 w-1/3 rounded bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-800" />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="h-28 rounded-2xl bg-slate-800" />
            <div className="h-28 rounded-2xl bg-slate-800" />
            <div className="h-28 rounded-2xl bg-slate-800" />
          </div>
        </div>
        <p className="sr-only">Loading dashboard…</p>
      </div>
    </div>
  );
}
