'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

type Props = {
  matchId: string;
};

export function CompleteMatchButton({ matchId }: Props) {
  const t = useTranslations('MatchDetail');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/complete`, { method: 'PATCH' });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p className="text-muted-foreground text-sm">{t('completedConfirmation')}</p>;
  }

  return (
    <Button onClick={handleComplete} disabled={loading} variant="secondary" size="sm">
      {loading ? t('completing') : t('markCompleted')}
    </Button>
  );
}
