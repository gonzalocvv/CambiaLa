import Link from 'next/link';
import { Settings } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getSession } from '@/lib/auth';
import { notificationService } from '@/services/notification.service';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';

export async function AppNavbar() {
  const t = await getTranslations('AppNav');
  const session = await getSession();

  let initialUnreadCount = 0;
  if (session) {
    const { unreadCount } = await notificationService.getNotificationsForUser(session.userId, 1, 1);
    initialUnreadCount = unreadCount;
  }

  return (
    <>
      <header className="border-border bg-background/90 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/album" className="flex items-center text-lg font-extrabold">
            <span className="text-brand">Cambia</span>
            <span className="text-accent">La</span>
          </Link>

          <nav className="flex items-center gap-1">
            {/* Links de nav: solo desktop. En mobile van al bottom tab bar (RF-824). */}
            <div className="hidden items-center gap-1 md:flex">
              <Link
                href="/album"
                className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {t('album')}
              </Link>
              <Link
                href="/matches"
                className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {t('matches')}
              </Link>
              <Link
                href="/activities"
                className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {t('activities')}
              </Link>
              <Link
                href="/conversations"
                className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {t('conversations')}
              </Link>
            </div>

            {/* La campana queda visible también en mobile (no está en el bottom bar). */}
            {session && <NotificationBell initialUnreadCount={initialUnreadCount} />}

            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground hidden rounded-lg p-2 transition-colors md:flex"
              aria-label={t('settings')}
            >
              <Settings className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </header>

      <BottomTabBar />
    </>
  );
}
