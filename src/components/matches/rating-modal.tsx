'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

type Props = {
  matchId: string;
  partnerName: string;
};

export function RatingModal({ matchId, partnerName }: Props) {
  const t = useTranslations('Rating');
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit() {
    if (stars === 0) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/matches/${matchId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars, comment: comment.trim() || undefined }),
      });
      if (res.ok || res.status === 409) {
        setDone(true);
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-card border-border rounded-lg border p-4 text-center">
        <p className="text-foreground font-medium">{t('thankYou')}</p>
      </div>
    );
  }

  const displayStars = hovered > 0 ? hovered : stars;

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <h3 className="text-foreground mb-1 font-semibold">{t('title')}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{t('subtitle', { name: partnerName })}</p>

      {/* Star selector */}
      <div className="mb-4 flex gap-1" role="group" aria-label={t('starsLabel')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={t('starN', { n })}
            aria-pressed={stars === n}
            className={`text-2xl transition-transform hover:scale-110 focus:outline-none ${
              n <= displayStars ? 'text-accent-text' : 'text-muted-foreground'
            }`}
            onClick={() => setStars(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
          >
            ★
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={200}
        rows={3}
        placeholder={t('commentPlaceholder')}
        className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring mb-1 w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
      />
      <p className="text-muted-foreground mb-4 text-right text-xs">{comment.length}/200</p>

      {error && <p className="text-destructive mb-3 text-sm">{t('error')}</p>}

      <Button onClick={handleSubmit} disabled={stars === 0 || loading} size="sm" className="w-full">
        {loading ? t('sending') : t('submit')}
      </Button>
    </div>
  );
}
