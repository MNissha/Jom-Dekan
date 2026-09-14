export function AdminSectionSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8" role="status" aria-label="Loading admin page">
      <div className="h-36 animate-pulse rounded-[26px] bg-gradient-to-r from-[#332475]/25 via-[#4338CA]/20 to-[#6558DD]/20" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-[#E8E5F7] bg-white" />)}
      </div>
      <div className="h-11 w-full max-w-md animate-pulse rounded-xl bg-slate-200" />
      <div className="overflow-hidden rounded-[22px] border border-[#E8E5F7] bg-white p-5 shadow-sm">
        <div className="mb-4 h-5 w-2/5 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
      </div>
      <span className="sr-only">Loading admin content...</span>
    </div>
  );
}
