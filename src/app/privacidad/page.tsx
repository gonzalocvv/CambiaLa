import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Privacy');
  return { title: t('metaTitle') };
}

const dataItems = ['data1', 'data2', 'data3', 'data4', 'data5'] as const;
const useItems = ['use1', 'use2', 'use3', 'use4'] as const;
const rightItems = ['right1', 'right2', 'right3', 'right4'] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border mt-10 border-t pt-8">
      <h2 className="text-foreground mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function PrivacidadPage() {
  const t = await getTranslations('Privacy');

  const emailLink = (chunks: React.ReactNode) => (
    <a href={`mailto:${t('rightsEmail')}`} className="text-primary hover:underline">
      {chunks}
    </a>
  );

  const contactEmailLink = (chunks: React.ReactNode) => (
    <a href={`mailto:${t('contactEmail')}`} className="text-primary hover:underline">
      {chunks}
    </a>
  );

  return (
    <StaticPageLayout>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-muted-foreground text-sm">{t('lastUpdated')}</p>
        <h1 className="text-foreground mt-3 text-4xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-6 text-base leading-relaxed">{t('intro')}</p>

        <Section title={t('dataTitle')}>
          <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
            {dataItems.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                {t(key)}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('useTitle')}>
          <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
            {useItems.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                {t(key)}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('sharingTitle')}>
          <p className="text-muted-foreground text-sm leading-relaxed">{t('sharingDesc')}</p>
        </Section>

        <Section title={t('rightsTitle')}>
          <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
            {rightItems.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                {t(key)}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-sm">
            {t.rich('rightsNote', { emailLink })}
          </p>
        </Section>

        <Section title={t('securityTitle')}>
          <p className="text-muted-foreground text-sm leading-relaxed">{t('securityDesc')}</p>
        </Section>

        <Section title={t('contactTitle')}>
          <p className="text-muted-foreground text-sm">
            {t.rich('contactNote', { emailLink: contactEmailLink })}
          </p>
        </Section>
      </div>
    </StaticPageLayout>
  );
}
