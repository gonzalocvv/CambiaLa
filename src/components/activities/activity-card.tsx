import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ActivityItem } from '@/lib/validations/activity.schema';

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-UY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function ActivityCard({ activity }: { activity: ActivityItem }) {
  const t = useTranslations('Activities');

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="border-border bg-card hover:border-primary/40 block overflow-hidden rounded-xl border transition-colors"
    >
      {activity.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- banner remoto simple (Supabase Storage); evitamos config de next/image para una imagen decorativa
        <img
          src={activity.bannerUrl}
          alt=""
          className="aspect-[16/9] w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="bg-muted flex aspect-[16/9] w-full items-center justify-center" aria-hidden>
          <span className="text-3xl">🤝</span>
        </div>
      )}

      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="bg-secondary text-secondary-foreground dark:bg-accent/10 dark:text-accent rounded-full px-2 py-0.5 text-xs font-medium">
            {activity.department}
          </span>
        </div>
        <h2 className="text-foreground text-base font-semibold">{activity.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('dateLabel')}: {formatWhen(activity.startsAt)}
        </p>
        {activity.location && (
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t('locationLabel')}: {activity.location}
          </p>
        )}
      </div>
    </Link>
  );
}
