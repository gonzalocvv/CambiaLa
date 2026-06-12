import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { AppNavbar } from '@/components/layout/app-navbar';
import { Badge } from '@/components/ui/badge';
import { activityService } from '@/services/activity.service';

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AdminActivitiesPage({ searchParams }: Props) {
  const t = await getTranslations('Admin.activities');
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const pageSize = 20;

  const { activities, total } = await activityService.listForAdmin({ page, pageSize });
  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/admin" className="text-muted-foreground hover:text-foreground text-sm">
          {t('backToPanel')}
        </Link>

        <div className="mt-2 mb-6 flex items-center justify-between gap-4">
          <h1 className="text-foreground text-2xl font-bold">{t('title')}</h1>
          <Link
            href="/admin/activities/new"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            {t('newButton')}
          </Link>
        </div>

        {activities.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">{t('empty')}</p>
        ) : (
          <div className="border-border overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['colTitle', 'colDepartment', 'colDate', 'colStatus', 'colActions'].map((k) => (
                    <th key={k} className="text-muted-foreground px-4 py-3 text-left font-medium">
                      {t(k as Parameters<typeof t>[0])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {activities.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="text-foreground max-w-[240px] truncate px-4 py-3">{a.title}</td>
                    <td className="text-muted-foreground px-4 py-3">{a.department}</td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {new Date(a.startsAt).toLocaleDateString('es-UY', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {a.isPublished ? (
                        <Badge variant="outline">{t('statusPublished')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('statusDraft')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/activities/${a.id}/edit`}
                        className="text-primary text-sm hover:underline"
                      >
                        {t('edit')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-end gap-2">
            {page > 1 && (
              <Link
                href={`/admin/activities?page=${page - 1}`}
                className="border-border hover:bg-muted rounded-md border px-3 py-1 text-sm"
              >
                ←
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/activities?page=${page + 1}`}
                className="border-border hover:bg-muted rounded-md border px-3 py-1 text-sm"
              >
                →
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}
