import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Contact');
  return { title: t('metaTitle') };
}

export default async function ContactoPage() {
  const t = await getTranslations('Contact');
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

      {/* Cards */}
      <section className="border-border border-t px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {/* Email */}
          <div className="border-border bg-card rounded-2xl border p-8">
            <h2 className="text-foreground text-xl font-semibold">{t('emailTitle')}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t('emailDesc')}</p>
            <a
              href={`mailto:${t('email')}`}
              className="text-primary hover:text-primary/80 mt-4 block text-lg font-medium transition-colors"
            >
              {t('email')}
            </a>
            <p className="text-muted-foreground mt-2 text-xs">{t('responseTime')}</p>
          </div>

          {/* Privacy */}
          <div className="border-border bg-card rounded-2xl border p-8">
            <h2 className="text-foreground text-xl font-semibold">{t('privacyTitle')}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t('privacyDesc')}</p>
          </div>

          {/* Bugs */}
          <div className="border-border bg-card rounded-2xl border p-8">
            <h2 className="text-foreground text-xl font-semibold">{t('bugTitle')}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t('bugDesc')}</p>
          </div>

          {/* Socials */}
          <div className="border-border bg-muted/40 rounded-2xl border p-8">
            <h2 className="text-foreground text-xl font-semibold">{t('socialsTitle')}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t('socialsDesc')}</p>
          </div>
        </div>
      </section>
    </StaticPageLayout>
  );
}
