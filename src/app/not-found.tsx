import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function NotFound() {
  const t = await getTranslations('ErrorPages');
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">404</p>
        <h1 className="text-foreground text-3xl font-bold">{t('notFoundTitle')}</h1>
        <p className="text-muted-foreground max-w-sm">{t('notFoundSubtitle')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/album"
          className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          {t('notFoundCta')}
        </Link>
        <Link
          href="/"
          className="border-border text-foreground inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
        >
          {t('notFoundCtaAlt')}
        </Link>
      </div>
    </main>
  );
}
