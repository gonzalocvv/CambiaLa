import { ScrollHint } from '@/components/coming-soon/ScrollHint';
import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const t = await getTranslations('Home');

  return (
    <div className="flex flex-1 flex-col bg-slate-950 text-white">
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl space-y-8 text-center">
          <h1 className="text-6xl font-extrabold tracking-tight md:text-8xl">
            {t('hero.titlePrefix')}
            <span className="text-orange-500">{t('hero.titleHighlight')}</span>
          </h1>

          <p className="text-2xl font-light text-slate-300 md:text-3xl">{t('hero.subtitle')}</p>

          <div className="inline-block">
            <span className="inline-flex items-center rounded-full bg-orange-500/10 px-6 py-3 text-base font-medium text-orange-400 ring-1 ring-orange-500/30 ring-inset">
              {t('hero.badge')}
            </span>
          </div>

          <p className="pt-8 text-sm text-slate-500">
            {t('hero.descriptionLine1')}
            <br />
            {t('hero.descriptionLine2')}
          </p>
        </div>

        <ScrollHint targetId="como-funciona" label={t('hero.scrollHint')} />
      </section>

      <section
        id="como-funciona"
        className="relative scroll-mt-8 border-t border-slate-800/60 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950 px-6 py-28"
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

      <footer className="border-t border-slate-800/60 px-6 py-8 text-center text-xs text-slate-600">
        {t.rich('footer', {
          heart: (chunks) => <span className="text-orange-500">{chunks}</span>,
        })}
      </footer>
    </div>
  );
}
