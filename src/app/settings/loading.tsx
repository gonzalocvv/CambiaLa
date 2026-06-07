export default function SettingsLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando ajustes">
      <div className="border-border bg-card sticky top-0 z-10 h-14 border-b" />
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="bg-muted mb-8 h-8 w-32 rounded" />
        <div className="space-y-8">
          {/* Profile section skeleton */}
          <div className="space-y-4">
            <div className="bg-muted h-5 w-28 rounded" />
            <div className="bg-muted h-10 w-full rounded" />
            <div className="bg-muted h-20 w-full rounded" />
          </div>
          {/* Location section skeleton */}
          <div className="space-y-4">
            <div className="bg-muted h-5 w-24 rounded" />
            <div className="bg-muted h-10 w-full rounded" />
            <div className="bg-muted h-10 w-full rounded" />
          </div>
          {/* Toggles section skeleton */}
          <div className="space-y-3">
            <div className="bg-muted h-5 w-36 rounded" />
            <div className="flex items-center justify-between">
              <div className="bg-muted h-4 w-40 rounded" />
              <div className="bg-muted h-6 w-11 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div className="bg-muted h-4 w-32 rounded" />
              <div className="bg-muted h-6 w-11 rounded-full" />
            </div>
          </div>
          {/* Save button skeleton */}
          <div className="bg-muted h-10 w-36 rounded" />
        </div>
      </div>
    </div>
  );
}
