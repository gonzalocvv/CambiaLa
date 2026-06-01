'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { NotificationItem, NotificationType } from '@/lib/validations/notification.schema';

type Props = {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => Promise<void>;
  onClose: () => void;
};

function getHref(type: NotificationType, payload: Record<string, unknown>): string {
  const matchId = typeof payload.matchId === 'string' ? payload.matchId : null;
  if (matchId && (type === 'new_match' || type === 'new_message' || type === 'trade_completed')) {
    return `/matches/${matchId}`;
  }
  return '/matches';
}

export function NotificationDropdown({ notifications, onMarkRead, onClose }: Props) {
  const t = useTranslations('Notifications');
  const router = useRouter();

  const handleClick = async (n: NotificationItem) => {
    onClose();
    if (!n.readAt) await onMarkRead(n.id);
    router.push(getHref(n.type, n.payload));
  };

  return (
    <div className="bg-card border-border absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border shadow-lg">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <p className="text-foreground text-sm font-semibold">{t('bellLabel')}</p>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-center text-sm">{t('empty')}</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => void handleClick(n)}
                className={`hover:bg-muted w-full px-4 py-3 text-left transition-colors ${
                  !n.readAt ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.readAt && (
                    <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                  )}
                  {n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">
                      {t(n.type as Parameters<typeof t>[0])}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {t(`${n.type}Detail` as Parameters<typeof t>[0], {
                        score: typeof n.payload.score === 'number' ? n.payload.score : 0,
                      })}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {new Date(n.createdAt).toLocaleDateString('es-UY', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
