import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AppNavbar } from '@/components/layout/app-navbar';
import { Badge } from '@/components/ui/badge';
import SuspendButton from '@/components/admin/suspend-button';
import { userService, UserNotFoundError } from '@/services/user.service';

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  const t = await getTranslations('Admin');
  const { id } = await params;

  let user;
  try {
    user = await userService.getUserDetailForAdmin(id);
  } catch (e) {
    if (e instanceof UserNotFoundError) notFound();
    throw e;
  }

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t('detailEmail'), value: user.email },
    { label: t('detailUsername'), value: user.username ?? '—' },
    { label: t('detailName'), value: user.name ?? '—' },
    {
      label: t('detailCity'),
      value: [user.city, user.neighborhood].filter(Boolean).join(', ') || '—',
    },
    {
      label: t('detailRole'),
      value:
        user.role === 'admin' ? (
          <Badge variant="default">{t('roleAdmin')}</Badge>
        ) : (
          <Badge variant="secondary">{t('roleUser')}</Badge>
        ),
    },
    {
      label: t('detailStatus'),
      value: user.isSuspended ? (
        <Badge variant="destructive">{t('statusSuspended')}</Badge>
      ) : (
        <Badge variant="outline">{t('statusActive')}</Badge>
      ),
    },
    {
      label: t('detailReputation'),
      value: `${user.reputation.toFixed(1)} ⭐ · ${user.tradesCompleted} cambios`,
    },
    { label: t('detailJoined'), value: new Date(user.createdAt).toLocaleDateString('es-UY') },
    { label: t('detailLastSeen'), value: new Date(user.lastSeenAt).toLocaleDateString('es-UY') },
  ];

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/admin"
          className="text-muted-foreground mb-6 inline-block text-sm hover:underline"
        >
          {t('backToList')}
        </Link>

        <h1 className="text-foreground mb-6 text-2xl font-bold">{t('detailTitle')}</h1>

        <div className="border-border rounded-md border">
          {rows.map((row) => (
            <div key={row.label} className="border-border flex border-b px-4 py-3 last:border-b-0">
              <span className="text-muted-foreground w-40 shrink-0 text-sm">{row.label}</span>
              <span className="text-foreground text-sm">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Suspend / unsuspend action (RF-1004) */}
        {user.role !== 'admin' && (
          <div className="mt-8">
            <SuspendButton
              userId={user.id}
              isSuspended={user.isSuspended}
              labelSuspend={t('suspendButton')}
              labelUnsuspend={t('unsuspendButton')}
              labelWorking={t('suspending')}
              confirmSuspend={t('suspendConfirm')}
              confirmUnsuspend={t('unsuspendConfirm')}
            />
          </div>
        )}
      </main>
    </>
  );
}
