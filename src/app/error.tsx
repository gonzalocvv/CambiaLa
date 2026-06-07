'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('ErrorPages');
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <p className="text-destructive text-sm font-semibold tracking-wide uppercase">Error</p>
        <h1 className="text-foreground text-3xl font-bold">{t('errorTitle')}</h1>
        <p className="text-muted-foreground max-w-sm">{t('errorSubtitle')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          {t('errorRetry')}
        </button>
        <Link
          href="/"
          className="border-border text-foreground inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
        >
          {t('errorCta')}
        </Link>
      </div>
    </main>
  );
}
