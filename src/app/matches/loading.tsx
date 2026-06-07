export default function MatchesLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando matches">
      <div className="border-border bg-card sticky top-0 z-10 h-14 border-b" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="bg-muted mb-6 h-8 w-40 rounded" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border-border rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-muted h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted h-4 w-32 rounded" />
                  <div className="bg-muted h-3 w-48 rounded" />
                </div>
                <div className="bg-muted h-6 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
