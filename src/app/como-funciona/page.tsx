import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cambia-la.vercel.app';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ComoFunciona');
  return { title: t('metaTitle'), alternates: { canonical: `${BASE_URL}/como-funciona` } };
}

const steps = ['step1', 'step2', 'step3'] as const;
const faqs = ['faq1', 'faq2', 'faq3', 'faq4'] as const;

export default async function ComoFuncionaPage() {
  const t = await getTranslations('ComoFunciona');
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

      {/* Steps */}
      <section className="border-border border-t px-6 py-20">
        <div className="mx-auto max-w-4xl space-y-16">
          {steps.map((key, i) => (
            <div key={key} className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
              <div className="bg-accent text-accent-foreground shadow-accent/30 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold shadow-lg">
                {i + 1}
              </div>
              <div>
                <h2 className="text-foreground text-2xl font-semibold">{t(`${key}Title`)}</h2>
                <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                  {t(`${key}Desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-border bg-muted/30 border-t px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground mb-12 text-3xl font-bold">{t('faqTitle')}</h2>
          <div className="space-y-8">
            {faqs.map((key) => (
              <div key={key}>
                <h3 className="text-foreground text-lg font-semibold">{t(`${key}Q`)}</h3>
                <p className="text-muted-foreground mt-2 text-base leading-relaxed">
                  {t(`${key}A`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-border border-t px-6 py-20">
        <div className="mx-auto max-w-xl space-y-4 text-center">
          <h2 className="text-foreground text-3xl font-bold">{t('ctaTitle')}</h2>
          <p className="text-muted-foreground">{t('ctaSubtitle')}</p>
          <Link
            href="/auth/login"
            className="bg-accent text-accent-foreground shadow-accent/25 hover:bg-accent/90 inline-flex items-center justify-center rounded-xl px-8 py-4 text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5"
          >
            {t('cta')} →
          </Link>
        </div>
      </section>
    </StaticPageLayout>
  );
}
