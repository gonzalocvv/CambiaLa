import { getTranslations } from 'next-intl/server';
import { Navbar } from './navbar';
import { SiteFooter } from './site-footer';

export async function StaticPageLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('Home');
  return (
    <div className="bg-background text-foreground flex min-h-full flex-col">
      <Navbar loginLabel={t('nav.login')} ctaLabel={t('nav.cta')} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
