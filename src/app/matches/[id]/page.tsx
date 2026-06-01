import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompleteMatchButton } from '@/components/matches/complete-match-button';
import { RatingModal } from '@/components/matches/rating-modal';
import { AppNavbar } from '@/components/layout/app-navbar';
import { ChatPanel } from '@/components/chat/chat-panel';
import { getSession } from '@/lib/auth';
import { matchService } from '@/services/match.service';
import { messageService } from '@/services/message.service';
import { ratingService } from '@/services/rating.service';

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
  const [match, initialMessages, ratingData] = await Promise.all([
    matchService.getMatchDetailForUser(id, session.userId),
    messageService.getMessages(id, session.userId).catch(() => []),
    ratingService.getRatingsForMatch(id, session.userId).catch(() => null),
  ]);

  if (!match) notFound();

  const { partner, score, youGet, youGive } = match;
  const displayName = partner.username ?? partner.name ?? t('unknownUser');
  const location = partner.neighborhood ?? partner.city;
  const initials = displayName.slice(0, 2).toUpperCase();
  const isNewCollector = partner.tradesCompleted < 5;

  return (
    <>
      <AppNavbar />
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
                className="bg-muted h-16 w-16 rounded-full bg-cover bg-center"
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
            {partner.bio && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{partner.bio}</p>
            )}
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
          <div className="mb-6 space-y-3">
            <Badge variant="secondary">{t('statusCompleted')}</Badge>
            {ratingData && !ratingData.hasRated && (
              <RatingModal matchId={match.id} partnerName={displayName} />
            )}
          </div>
        )}
        {match.status === 'inactive' && (
          <div className="mb-6 space-y-1">
            <Badge variant="outline">{t('statusInactive')}</Badge>
            <p className="text-muted-foreground text-xs">{t('inactiveNote')}</p>
          </div>
        )}

        {/* Two-column sticker exchange */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        {/* RF-501/502/503/505 Chat */}
        <section>
          <h2 className="text-foreground mb-3 text-base font-semibold">{t('chatTitle')}</h2>
          <ChatPanel
            matchId={match.id}
            currentUserId={session.userId}
            initialMessages={initialMessages}
          />
        </section>
      </main>
    </>
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
