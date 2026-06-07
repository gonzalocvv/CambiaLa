'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Datos de ejemplo del mock (no son copy traducible: los textos van por i18n).
// score = min(youGet, youGive), igual que el match engine real.
const MOCK = {
  score: 3,
  youGet: 5,
  youGive: 3,
  rating: 4.8,
  trades: 12,
} as const;

/**
 * Réplica estática del `MatchCard` real para el hero de la landing.
 * Misma jerarquía de campos SEPARADOS (avatar / nombre / barrio / score /
 * intercambio / reputación) para que landing y app se vean 1:1.
 */
export function MatchCardMock() {
  const t = useTranslations('MatchCard');
  const tm = useTranslations('Home.hero.matchMock');

  const name = tm('name');
  const neighborhood = tm('neighborhood');
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <Card className="w-full max-w-xs shadow-lg">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="bg-primary text-primary-foreground flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-foreground truncate font-semibold">{name}</p>
              <p className="text-muted-foreground truncate text-sm">{neighborhood}</p>
            </div>
            <Badge variant="accent" className="shrink-0 tabular-nums">
              {t('scoreLabel')} {MOCK.score}
            </Badge>
          </div>

          <p className="text-muted-foreground mt-2 text-sm">
            {t('stickersExchange', { youGet: MOCK.youGet, youGive: MOCK.youGive })}
          </p>

          <p className="text-muted-foreground mt-1 text-xs">
            {`${MOCK.rating.toFixed(1)} ⭐ · ${t('trades', { count: MOCK.trades })}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
