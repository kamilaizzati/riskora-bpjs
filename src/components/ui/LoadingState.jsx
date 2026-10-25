export default function LoadingState() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <span className="sr-only">Memuat dashboard...</span>
      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl border border-line bg-white" />)}
      </div>
      <div className="h-[420px] animate-pulse rounded-2xl border border-line bg-white" />
    </div>
  );
}
