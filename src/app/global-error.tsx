'use client';

import Link from 'next/link';

// Last-resort boundary that replaces the root layout.
// next-intl's NextIntlClientProvider is not available here, so strings are
// hardcoded in Spanish. This is an accepted exception: the component fires only
// when the root layout itself crashes, which is extremely rare in production.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="es">
      <body className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Algo salió mal</h1>
          <p className="text-muted-foreground max-w-sm">
            Ocurrió un error inesperado. Podés intentar de nuevo.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="border-border text-foreground inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Ir al inicio
          </Link>
        </div>
      </body>
    </html>
  );
}
