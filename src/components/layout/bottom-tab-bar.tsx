'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, ArrowLeftRight, CalendarDays, MessageCircle, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Tab = {
  href: string;
  labelKey: 'album' | 'matches' | 'activities' | 'conversations' | 'settings';
  Icon: typeof LayoutGrid;
};

const TABS: Tab[] = [
  { href: '/album', labelKey: 'album', Icon: LayoutGrid },
  { href: '/matches', labelKey: 'matches', Icon: ArrowLeftRight },
  { href: '/activities', labelKey: 'activities', Icon: CalendarDays },
  { href: '/conversations', labelKey: 'conversations', Icon: MessageCircle },
  { href: '/settings', labelKey: 'settings', Icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * RF-824 — Bottom tab bar mobile (principio de UX #3 del Notion: "Bottom
 * navigation bar, 4-5 ítems"). Solo visible en mobile (`md:hidden`); en desktop
 * el AppNavbar top sigue mostrando los links. Active state con `usePathname`.
 * Respeta el safe-area inferior (iOS). Marca el `body` para reservar el espacio
 * y que el contenido no quede tapado por la barra fija.
 */
export function BottomTabBar() {
  const t = useTranslations('AppNav');
  const pathname = usePathname();

  useEffect(() => {
    document.body.dataset.hasTabbar = 'true';
    return () => {
      delete document.body.dataset.hasTabbar;
    };
  }, []);

  return (
    <nav
      aria-label={t('primary')}
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-sm md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, labelKey, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="leading-none">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
