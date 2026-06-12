import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AppNavbar } from '@/components/layout/app-navbar';
import { getSession } from '@/lib/auth';
import { activityService } from '@/services/activity.service';

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const activity = await activityService.getActivityDetail(id);
  if (!activity) notFound();

  const organizer = activity.author?.name ?? activity.author?.username ?? null;

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/activities" className="text-muted-foreground hover:text-foreground text-sm">
          {t('backToList')}
        </Link>

        {activity.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- banner remoto simple (Supabase Storage)
          <img
            src={activity.bannerUrl}
            alt=""
            className="border-border mt-4 aspect-[16/9] w-full rounded-xl border object-cover"
          />
        ) : (
          <div
            className="bg-muted mt-4 flex aspect-[16/9] w-full items-center justify-center rounded-xl"
            aria-hidden
          >
            <span className="text-4xl">🤝</span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <span className="bg-secondary text-secondary-foreground dark:bg-accent/10 dark:text-accent rounded-full px-2 py-0.5 text-xs font-medium">
            {activity.department}
          </span>
        </div>

        <h1 className="text-foreground mt-2 text-2xl font-bold">{activity.title}</h1>

        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground inline font-medium">{t('dateLabel')}: </dt>
            <dd className="text-foreground inline">
              {formatWhen(activity.startsAt)}
              {activity.endsAt ? ` · ${t('untilDate', { date: formatWhen(activity.endsAt) })}` : ''}
            </dd>
          </div>
          {activity.location && (
            <div>
              <dt className="text-muted-foreground inline font-medium">{t('locationLabel')}: </dt>
              <dd className="text-foreground inline">{activity.location}</dd>
            </div>
          )}
        </dl>

        {activity.description && (
          <p className="text-foreground mt-4 text-sm whitespace-pre-line">{activity.description}</p>
        )}

        {organizer && (
          <p className="text-muted-foreground mt-6 text-xs">
            {t('organizedBy', { name: organizer })}
          </p>
        )}
      </main>
    </>
  );
}
