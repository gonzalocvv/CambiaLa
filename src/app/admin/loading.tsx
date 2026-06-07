export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando panel de administración">
      <div className="border-border bg-card sticky top-0 z-10 h-14 border-b" />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="bg-muted mb-2 h-8 w-40 rounded" />
        <div className="bg-muted mb-6 h-4 w-24 rounded" />
        {/* Search bar skeleton */}
        <div className="mb-6 flex gap-2">
          <div className="bg-muted h-10 flex-1 rounded-md" />
          <div className="bg-muted h-10 w-20 rounded-md" />
        </div>
        {/* Table skeleton */}
        <div className="border-border overflow-hidden rounded-md border">
          <div className="bg-muted/50 h-11 w-full" />
          <div className="divide-border divide-y">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="bg-muted h-4 w-48 rounded" />
                <div className="bg-muted h-4 w-24 rounded" />
                <div className="bg-muted h-4 w-28 rounded" />
                <div className="bg-muted h-5 w-14 rounded-full" />
                <div className="bg-muted h-5 w-16 rounded-full" />
                <div className="bg-muted ml-auto h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
