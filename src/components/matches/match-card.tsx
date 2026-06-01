import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ActiveMatchItem } from '@/lib/validations/match.schema';

type Props = { match: ActiveMatchItem };

export default async function MatchCard({ match }: Props) {
  const t = await getTranslations('MatchCard');
  const { partner, score, youGet, youGive, unreadCount } = match;

  const displayName = partner.username ?? partner.name ?? t('unknownUser');
  const location = partner.neighborhood ?? partner.city;
  const initials = displayName.slice(0, 2).toUpperCase();
  const isNewCollector = partner.tradesCompleted < 5;

  return (
    <Link href={`/matches/${match.id}`} className="block">
      <Card className="transition-all hover:shadow-md active:scale-[0.99]">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="relative shrink-0">
            {partner.avatarUrl ? (
              <div
                className="bg-muted h-14 w-14 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(${partner.avatarUrl})` }}
                role="img"
                aria-label={displayName}
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold">
                {initials}
              </div>
            )}
            {unreadCount > 0 && (
              <span
                className="bg-accent text-accent-foreground absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums"
                aria-label={t('unreadMessages', { count: unreadCount })}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-foreground truncate font-semibold">{displayName}</p>
                {location && <p className="text-muted-foreground truncate text-sm">{location}</p>}
              </div>
              <Badge variant="accent" className="shrink-0 tabular-nums">
                {t('scoreLabel')} {score}
              </Badge>
            </div>

            <p className="text-muted-foreground mt-2 text-sm">
              {t('stickersExchange', { youGet: youGet.length, youGive: youGive.length })}
            </p>

            <p className="text-muted-foreground mt-1 text-xs">
              {isNewCollector
                ? t('newCollector')
                : `${partner.reputation.toFixed(1)} ⭐ · ${t('trades', { count: partner.tradesCompleted })}`}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
