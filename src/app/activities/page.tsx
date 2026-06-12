import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import ActivityCard from '@/components/activities/activity-card';
import { DepartmentSelect } from '@/components/activities/department-select';
import { AppNavbar } from '@/components/layout/app-navbar';
import { getSession } from '@/lib/auth';
import { ListActivitiesQuerySchema } from '@/lib/validations/activity.schema';
import { activityService } from '@/services/activity.service';
import { userService } from '@/services/user.service';

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const t = await getTranslations('Activities');
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">{t('notAuthenticated')}</p>
      </main>
    );
  }
  if (!session.onboardingDoneAt) redirect('/onboarding');

  const sp = await searchParams;
  const parsed = ListActivitiesQuerySchema.safeParse({ department: sp.department || undefined });
  const query = parsed.success ? parsed.data : { page: 1 as const, pageSize: 20 as const };

  const profile = await userService.getUserProfile(session.userId);
  const { activities, department } = await activityService.listForDepartment(
    profile.city ?? null,
    query,
  );

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-foreground mb-1 text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mb-6 text-sm">{t('subtitle')}</p>

        <div className="mb-6 max-w-xs">
          <DepartmentSelect value={department} />
        </div>

        {!department ? (
          <div className="py-16 text-center">
            <div className="text-5xl" aria-hidden>
              📍
            </div>
            <h2 className="text-foreground mt-4 mb-2 text-lg font-semibold">
              {t('chooseDepartmentTitle')}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-xs text-sm">
              {t('chooseDepartmentDescription')}
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl" aria-hidden>
              🗓️
            </div>
            <h2 className="text-foreground mt-4 mb-2 text-lg font-semibold">{t('emptyTitle')}</h2>
            <p className="text-muted-foreground mx-auto max-w-xs text-sm">
              {t('emptyDescription', { department })}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
