import { ExchangeAnimation } from '@/components/landing/exchange-animation';
import { Reveal } from '@/components/landing/reveal';
import { WhySection } from '@/components/landing/why-section';
import { Navbar } from '@/components/layout/navbar';
import { SiteFooter } from '@/components/layout/site-footer';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cambia-la.vercel.app';

export const metadata: Metadata = {
  alternates: { canonical: BASE_URL },
};

export default async function Home() {
  const t = await getTranslations('Home');

  return (
    <div className="bg-background text-foreground flex flex-1 flex-col">
      <Navbar loginLabel={t('nav.login')} ctaLabel={t('nav.cta')} />

      {/* Hero — el match es el héroe */}
      <section className="bg-secondary/40 relative px-6 py-14 md:py-20 dark:bg-transparent">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-8">
          {/* Copy (estático para no afectar el LCP) */}
          <div className="text-center lg:text-left">
            <div className="bg-secondary text-secondary-foreground ring-primary/20 dark:bg-accent/10 dark:text-accent dark:ring-accent/20 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset">
              <span aria-hidden="true">🇺🇾</span>
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              {t.rich('hero.title', {
                hl: (chunks) => <span className="text-accent">{chunks}</span>,
              })}
            </h1>

            <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg font-light md:text-xl lg:mx-0">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/auth/login"
                className="bg-accent text-accent-foreground shadow-accent/25 hover:bg-accent/90 hover:shadow-accent/30 inline-flex items-center justify-center rounded-xl px-8 py-4 text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                {t('hero.cta')} →
              </Link>
              <a
                href="#como-funciona"
                className="border-border text-muted-foreground hover:border-primary hover:text-foreground inline-flex items-center justify-center rounded-xl border px-8 py-4 text-base font-semibold transition-all"
              >
                {t('hero.ctaSecondary')}
              </a>
            </div>
          </div>

          {/* Escena del intercambio + match card como desenlace */}
          <div className="flex justify-center">
            <ExchangeAnimation />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-border bg-muted/40 border-y px-6 py-10">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-primary text-2xl font-bold md:text-3xl">
              {t('stats.stickersValue')}
            </p>
            <p className="text-muted-foreground text-xs md:text-sm">{t('stats.stickersLabel')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-primary text-2xl font-bold md:text-3xl">{t('stats.freeValue')}</p>
            <p className="text-muted-foreground text-xs md:text-sm">{t('stats.freeLabel')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-primary text-2xl font-bold md:text-3xl">
              {t('stats.locationValue')}
            </p>
            <p className="text-muted-foreground text-xs md:text-sm">{t('stats.locationLabel')}</p>
          </div>
        </div>
      </section>

      {/* ¿Por qué CambiaLa? — el diferencial */}
      <Reveal>
        <WhySection />
      </Reveal>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="border-border bg-muted/30 relative scroll-mt-16 border-t px-6 py-28"
      >
        <div
          aria-hidden="true"
          className="bg-accent/20 pointer-events-none absolute inset-x-0 top-0 mx-auto h-32 w-32 -translate-y-1/2 rounded-full blur-3xl md:w-64"
        />

        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              {t('howItWorks.eyebrow')}
            </p>
            <h2 className="text-foreground mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              {t('howItWorks.title')}
            </h2>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-base md:text-lg">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-3 md:gap-8">
            {[
              { num: '1', title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc') },
              { num: '2', title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc') },
              { num: '3', title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc') },
            ].map(({ num, title, desc }) => (
              <div
                key={num}
                className="border-accent/20 bg-card hover:border-accent/60 hover:shadow-accent/10 group relative rounded-2xl border p-8 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="bg-accent text-accent-foreground shadow-accent/30 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold shadow-lg transition-transform group-hover:scale-110">
                  {num}
                </div>
                <h3 className="text-foreground mt-6 text-2xl font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-3 text-base leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Casos de uso */}
      <section className="border-border bg-muted/20 border-t px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              {t('useCases.eyebrow')}
            </p>
            <h2 className="text-foreground mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              {t('useCases.title')}
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3 md:gap-8">
            {[
              {
                emoji: t('useCases.case1Emoji'),
                title: t('useCases.case1Title'),
                desc: t('useCases.case1Desc'),
              },
              {
                emoji: t('useCases.case2Emoji'),
                title: t('useCases.case2Title'),
                desc: t('useCases.case2Desc'),
              },
              {
                emoji: t('useCases.case3Emoji'),
                title: t('useCases.case3Title'),
                desc: t('useCases.case3Desc'),
              },
            ].map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="border-border bg-card hover:border-primary/40 rounded-2xl border p-8 transition-all"
              >
                <span className="text-4xl" role="img" aria-hidden="true">
                  {emoji}
                </span>
                <h3 className="text-foreground mt-4 text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-3 text-base leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-border border-t px-6 py-28">
        <div className="mx-auto max-w-xl space-y-6 text-center">
          <h2 className="text-foreground text-4xl font-bold tracking-tight md:text-5xl">
            {t('finalCta.title')}
          </h2>
          <p className="text-muted-foreground text-lg">{t('finalCta.subtitle')}</p>
          <Link
            href="/auth/login"
            className="bg-accent text-accent-foreground shadow-accent/25 hover:bg-accent/90 hover:shadow-accent/30 inline-flex items-center justify-center rounded-xl px-10 py-4 text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            {t('finalCta.cta')} →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
