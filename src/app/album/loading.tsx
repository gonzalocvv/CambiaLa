export default function AlbumLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando álbum">
      <div className="border-border bg-card sticky top-0 z-10 h-14 border-b" />
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <div className="bg-muted mb-6 h-8 w-32 rounded" />
        <div className="mb-6 flex flex-wrap gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted h-16 w-24 rounded-lg" />
          ))}
        </div>
        <div className="mb-4 flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-muted h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9 md:grid-cols-12">
          {[...Array(36)].map((_, i) => (
            <div key={i} className="bg-muted aspect-square rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
