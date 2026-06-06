import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cambia-la.vercel.app';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Pricing');
  return { title: t('metaTitle'), alternates: { canonical: `${BASE_URL}/precios` } };
}

const freeFeatures = ['freeF1', 'freeF2', 'freeF3', 'freeF4', 'freeF5', 'freeF6'] as const;
const proFeatures = ['proF1'] as const;

export default async function PreciosPage() {
  const t = await getTranslations('Pricing');
  return (
    <StaticPageLayout>
      {/* Hero */}
      <section className="bg-secondary/40 px-6 py-20 dark:bg-transparent">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            {t('eyebrow')}
          </p>
          <h1 className="text-foreground mt-4 text-5xl font-extrabold tracking-tight md:text-6xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg md:text-xl">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="border-border border-t px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {/* Free plan */}
          <div className="border-primary/30 bg-card relative rounded-2xl border-2 p-8 shadow-sm">
            <div className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold">
              {t('freePlanTagline')}
            </div>
            <h2 className="text-foreground text-2xl font-bold">{t('freePlanName')}</h2>
            <p className="text-foreground mt-1 text-4xl font-extrabold">{t('freePlanPrice')}</p>
            <p className="text-muted-foreground mt-3 text-sm">{t('freePlanDesc')}</p>
            <ul className="mt-6 space-y-3">
              {freeFeatures.map((key) => (
                <li key={key} className="text-foreground flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5 shrink-0 text-base">✓</span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/login"
              className="bg-accent text-accent-foreground hover:bg-accent/90 mt-8 flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all"
            >
              {t('freeCta')} →
            </Link>
          </div>

          {/* Pro plan */}
          <div className="border-border bg-muted/40 rounded-2xl border p-8">
            <div className="bg-muted text-muted-foreground -top-3 left-6 mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold">
              {t('proPlanTagline')}
            </div>
            <h2 className="text-foreground text-2xl font-bold">{t('proPlanName')}</h2>
            <p className="text-foreground mt-1 text-4xl font-extrabold">{t('proPlanPrice')}</p>
            <p className="text-muted-foreground mt-3 text-sm">{t('proPlanDesc')}</p>
            <ul className="mt-6 space-y-3">
              {proFeatures.map((key) => (
                <li key={key} className="text-muted-foreground flex items-start gap-2 text-sm">
                  <span className="mt-0.5 shrink-0 text-base">○</span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-8 text-sm italic">{t('proComingSoon')}</p>
          </div>
        </div>
      </section>

      {/* FAQ contact */}
      <section className="border-border bg-muted/20 border-t px-6 py-16">
        <div className="text-muted-foreground mx-auto max-w-xl text-center text-sm">
          <p className="font-medium">{t('faqTitle')}</p>
          <a
            href={`mailto:${t('faqEmail')}`}
            className="text-primary hover:text-primary/80 mt-1 inline-block transition-colors"
          >
            {t('faqEmail')}
          </a>
        </div>
      </section>
    </StaticPageLayout>
  );
}
