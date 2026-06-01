import { getTranslations } from 'next-intl/server';

import MatchCard from '@/components/matches/match-card';
import { getSession } from '@/lib/auth';
import { matchService } from '@/services/match.service';

export default async function MatchesPage() {
  const t = await getTranslations('MatchesList');
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">{t('notAuthenticated')}</p>
      </main>
    );
  }

  const matches = await matchService.getActiveMatchesWithPartners(session.userId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-foreground mb-6 text-2xl font-bold">{t('title')}</h1>

      {matches.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </main>
  );
}
