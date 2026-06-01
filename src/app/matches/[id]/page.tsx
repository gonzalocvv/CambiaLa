import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompleteMatchButton } from '@/components/matches/complete-match-button';
import { getSession } from '@/lib/auth';
import { matchService } from '@/services/match.service';

type Props = { params: Promise<{ id: string }> };

export default async function MatchDetailPage({ params }: Props) {
  const t = await getTranslations('MatchDetail');
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">{t('notAuthenticated')}</p>
      </main>
    );
  }

  const { id } = await params;
  const match = await matchService.getMatchDetailForUser(id, session.userId);

  if (!match) notFound();

  const { partner, score, youGet, youGive } = match;
  const displayName = partner.username ?? partner.name ?? 'Usuario';
  const location = partner.neighborhood ?? partner.city;
  const initials = displayName.slice(0, 2).toUpperCase();
  const isNewCollector = partner.tradesCompleted < 5;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/matches"
        className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm transition-colors"
      >
        {t('backToMatches')}
      </Link>

      {/* Partner header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="shrink-0">
          {partner.avatarUrl ? (
            <div
              className="h-16 w-16 rounded-full bg-slate-200 bg-cover bg-center dark:bg-slate-700"
              style={{ backgroundImage: `url(${partner.avatarUrl})` }}
              role="img"
              aria-label={displayName}
            />
          ) : (
            <div className="bg-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-foreground truncate text-xl font-bold">{displayName}</h1>
          {location && <p className="text-muted-foreground text-sm">{location}</p>}
          <p className="text-muted-foreground mt-1 text-xs">
            {isNewCollector
              ? t('newCollector')
              : `${partner.reputation.toFixed(1)} ⭐ · ${t('trades', { count: partner.tradesCompleted })}`}
          </p>
        </div>
        <Badge variant="accent" className="shrink-0 text-base tabular-nums">
          {t('scoreLabel')} {score}
        </Badge>
      </div>

      {/* Complete match action */}
      {match.status === 'active' && (
        <div className="mb-6 flex items-center gap-3">
          <CompleteMatchButton matchId={match.id} />
          <p className="text-muted-foreground text-xs">{t('completeHint')}</p>
        </div>
      )}
      {match.status === 'completed' && (
        <div className="mb-6">
          <Badge variant="secondary">{t('statusCompleted')}</Badge>
        </div>
      )}

      {/* Two-column sticker exchange */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t('youGetTitle')}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                ({t('stickersCount', { count: youGet.length })})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StickerGrid numbers={youGet} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t('youGiveTitle')}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                ({t('stickersCount', { count: youGive.length })})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StickerGrid numbers={youGive} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StickerGrid({ numbers }: { numbers: string[] }) {
  if (numbers.length === 0) {
    return <p className="text-muted-foreground text-sm">—</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {numbers.map((num) => (
        <Badge key={num} variant="secondary" className="font-mono text-xs">
          {num}
        </Badge>
      ))}
    </div>
  );
}
