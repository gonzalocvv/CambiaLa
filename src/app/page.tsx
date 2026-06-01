import { ScrollHint } from '@/components/coming-soon/ScrollHint';
import { Navbar } from '@/components/layout/navbar';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function Home() {
  const t = await getTranslations('Home');

  return (
    <div className="flex flex-1 flex-col bg-slate-950 text-white">
      <Navbar loginLabel={t('nav.login')} ctaLabel={t('nav.cta')} />

      {/* Hero */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl space-y-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 ring-1 ring-orange-500/20 ring-inset">
            <span>🇺🇾</span>
            <span>{t('hero.badge')}</span>
          </div>

          <h1 className="text-6xl font-extrabold tracking-tight md:text-8xl">
            {t('hero.titlePrefix')}
            <span className="text-orange-500">{t('hero.titleHighlight')}</span>
          </h1>

          <p className="text-2xl font-light text-slate-300 md:text-3xl">{t('hero.subtitle')}</p>

          <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row sm:justify-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-xl hover:shadow-orange-500/30"
            >
              {t('hero.cta')} →
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-8 py-4 text-base font-semibold text-slate-300 transition-all hover:border-slate-500 hover:text-white"
            >
              {t('hero.ctaSecondary')}
            </a>
          </div>
        </div>

        <ScrollHint targetId="como-funciona" label={t('hero.scrollHint')} />
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-800/60 bg-slate-900/40 px-6 py-10">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-orange-400 md:text-3xl">
              {t('stats.stickersValue')}
            </p>
            <p className="text-xs text-slate-500 md:text-sm">{t('stats.stickersLabel')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-orange-400 md:text-3xl">{t('stats.freeValue')}</p>
            <p className="text-xs text-slate-500 md:text-sm">{t('stats.freeLabel')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-orange-400 md:text-3xl">
              {t('stats.locationValue')}
            </p>
            <p className="text-xs text-slate-500 md:text-sm">{t('stats.locationLabel')}</p>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="relative scroll-mt-16 border-t border-slate-800/60 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950 px-6 py-28"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-32 w-32 -translate-y-1/2 rounded-full bg-orange-500/20 blur-3xl md:w-64"
        />

        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-orange-400 uppercase">
              {t('howItWorks.eyebrow')}
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              {t('howItWorks.title')}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-400 md:text-lg">
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
                className="group relative rounded-2xl border border-orange-500/20 bg-slate-900/60 p-8 backdrop-blur transition-all hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/10"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-bold text-white shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-110">
                  {num}
                </div>
                <h3 className="mt-6 text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Casos de uso */}
      <section className="border-t border-slate-800/60 bg-slate-900/20 px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-orange-400 uppercase">
              {t('useCases.eyebrow')}
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
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
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 transition-all hover:border-slate-700"
              >
                <span className="text-4xl" role="img" aria-hidden="true">
                  {emoji}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-slate-800/60 px-6 py-28">
        <div className="mx-auto max-w-xl space-y-6 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            {t('finalCta.title')}
          </h2>
          <p className="text-lg text-slate-400">{t('finalCta.subtitle')}</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-xl hover:shadow-orange-500/30"
          >
            {t('finalCta.cta')} →
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800/60 px-6 py-8 text-center text-xs text-slate-600">
        {t.rich('footer', {
          heart: (chunks) => <span className="text-orange-500">{chunks}</span>,
        })}
      </footer>
    </div>
  );
}
