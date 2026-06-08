import { ExchangeAnimation } from '@/components/landing/exchange-animation';
import { Reveal, RevealGroup, RevealItem } from '@/components/landing/reveal';
import { WhySection } from '@/components/landing/why-section';
import { Navbar } from '@/components/layout/navbar';
import { SiteFooter } from '@/components/layout/site-footer';
import { BgAnimateButton } from '@/components/ui/bg-animate-button';
import { GradientHeading } from '@/components/ui/gradient-heading';
import {
  MinimalCard,
  MinimalCardDescription,
  MinimalCardTitle,
} from '@/components/ui/minimal-card';
import { TextAnimate } from '@/components/ui/text-animate';
import { buildOrganizationJsonLd, buildWebSiteJsonLd, toJsonLdString } from '@/lib/json-ld';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cambia-la.vercel.app';

export const metadata: Metadata = {
  alternates: { canonical: BASE_URL },
};

export default async function Home() {
  const t = await getTranslations('Home');

  return (
    <div className="bg-background text-foreground flex flex-1 flex-col">
      {/* Schema.org JSON-LD — RF-809 */}
      {/* dangerouslySetInnerHTML es seguro aquí: toJsonLdString escapa <, >, & */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdString(buildWebSiteJsonLd(BASE_URL)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdString(buildOrganizationJsonLd(BASE_URL)) }}
      />
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
                hl: (chunks) => (
                  <GradientHeading asChild variant="brand" size="inherit" weight="inherit">
                    <span>{chunks}</span>
                  </GradientHeading>
                ),
              })}
            </h1>

            <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg font-light md:text-xl lg:mx-0">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <BgAnimateButton href="/auth/login?mode=signup">{t('hero.cta')} →</BgAnimateButton>
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
        <Reveal className="mx-auto grid max-w-3xl grid-cols-3 gap-4 text-center">
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
        </Reveal>
      </section>

      {/* ¿Por qué CambiaLa? — el diferencial (la sección maneja su propio reveal) */}
      <WhySection />

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

          <RevealGroup className="mt-20 grid gap-6 md:grid-cols-3 md:gap-8">
            {[
              { num: '1', title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc') },
              { num: '2', title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc') },
              { num: '3', title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc') },
            ].map(({ num, title, desc }) => (
              <RevealItem key={num}>
                <MinimalCard className="hover:border-accent/50 group h-full p-8 transition-colors">
                  <div className="bg-accent text-accent-foreground shadow-accent/30 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold shadow-lg transition-transform group-hover:scale-110">
                    {num}
                  </div>
                  <MinimalCardTitle className="mt-6 text-2xl">{title}</MinimalCardTitle>
                  <MinimalCardDescription className="mt-3 text-base leading-relaxed">
                    {desc}
                  </MinimalCardDescription>
                </MinimalCard>
              </RevealItem>
            ))}
          </RevealGroup>
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

          <RevealGroup className="mt-16 grid gap-6 md:grid-cols-3 md:gap-8">
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
              <RevealItem key={title}>
                <MinimalCard className="hover:border-primary/40 h-full p-8 transition-colors">
                  <span className="text-4xl" role="img" aria-hidden="true">
                    {emoji}
                  </span>
                  <MinimalCardTitle className="mt-4 text-xl">{title}</MinimalCardTitle>
                  <MinimalCardDescription className="mt-3 text-base leading-relaxed">
                    {desc}
                  </MinimalCardDescription>
                </MinimalCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-border border-t px-6 py-28">
        <div className="mx-auto max-w-xl space-y-6 text-center">
          <h2 className="text-foreground text-4xl font-bold tracking-tight md:text-5xl">
            <TextAnimate text={t('finalCta.title')} type="calmInUp" />
          </h2>
          <Reveal className="space-y-6">
            <p className="text-muted-foreground text-lg">{t('finalCta.subtitle')}</p>
            <div className="flex justify-center">
              <BgAnimateButton href="/auth/login?mode=signup" size="lg">
                {t('finalCta.cta')} →
              </BgAnimateButton>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
