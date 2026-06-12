import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { AppNavbar } from '@/components/layout/app-navbar';
import { Badge } from '@/components/ui/badge';
import { userService } from '@/services/user.service';

type Props = {
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const t = await getTranslations('Admin');
  const params = await searchParams;
  const search = params.search?.trim() || undefined;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const pageSize = 20;

  const { users, total } = await userService.listUsersForAdmin({ search, page, pageSize });
  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-foreground mb-2 text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mb-4 text-sm">
          {t('usersTitle')}: {total}
        </p>
        <nav className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/admin/activities/new"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            {t('activities.uploadButton')}
          </Link>
          <Link
            href="/admin/activities"
            className="border-border hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium"
          >
            {t('activities.navLink')}
          </Link>
        </nav>

        {/* Search form */}
        <form method="GET" className="mb-6 flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={search ?? ''}
            placeholder={t('searchPlaceholder')}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring flex-1 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            Buscar
          </button>
        </form>

        {users.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">{t('noResults')}</p>
        ) : (
          <div className="border-border overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    'colEmail',
                    'colUsername',
                    'colCity',
                    'colRole',
                    'colStatus',
                    'colJoined',
                    'colActions',
                  ].map((k) => (
                    <th key={k} className="text-muted-foreground px-4 py-3 text-left font-medium">
                      {t(k as Parameters<typeof t>[0])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="text-foreground max-w-[200px] truncate px-4 py-3">{u.email}</td>
                    <td className="text-muted-foreground px-4 py-3">{u.username ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-3">{u.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <Badge variant="default">{t('roleAdmin')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('roleUser')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.isSuspended ? (
                        <Badge variant="destructive">{t('statusSuspended')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('statusActive')}</Badge>
                      )}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('es-UY')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-primary text-sm hover:underline"
                      >
                        {t('viewProfile')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {t('page', { current: page, total: totalPages })}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className="border-border hover:bg-muted rounded-md border px-3 py-1 text-sm"
                >
                  {t('prevPage')}
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className="border-border hover:bg-muted rounded-md border px-3 py-1 text-sm"
                >
                  {t('nextPage')}
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
