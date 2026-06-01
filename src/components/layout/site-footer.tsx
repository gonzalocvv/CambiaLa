import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function SiteFooter() {
  const t = await getTranslations('SiteFooter');
  return (
    <footer className="border-border text-muted-foreground border-t px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-xs">{t('copy')}</p>
        <nav
          className="flex flex-wrap items-center justify-center gap-4 text-xs"
          aria-label="Footer"
        >
          <Link href="/como-funciona" className="hover:text-foreground transition-colors">
            {t('howItWorksLink')}
          </Link>
          <Link href="/precios" className="hover:text-foreground transition-colors">
            {t('pricingLink')}
          </Link>
          <Link href="/privacidad" className="hover:text-foreground transition-colors">
            {t('privacyLink')}
          </Link>
          <Link href="/terminos" className="hover:text-foreground transition-colors">
            {t('termsLink')}
          </Link>
          <Link href="/contacto" className="hover:text-foreground transition-colors">
            {t('contactLink')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
