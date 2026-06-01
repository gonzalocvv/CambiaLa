'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { StickerCell } from '@/components/album/sticker-cell';
import type { AlbumStats, StickerWithCount } from '@/lib/validations/sticker.schema';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function computeStats(stickers: StickerWithCount[], counts: Record<string, number>): AlbumStats {
  const total = stickers.length;
  const updated = stickers.map((s) => ({ count: counts[s.id] ?? s.count }));
  const have = updated.filter((s) => s.count >= 1).length;
  const missing = updated.filter((s) => s.count === 0).length;
  const duplicates = updated.filter((s) => s.count >= 2).length;
  const percentComplete = total > 0 ? Math.round((have / total) * 100) : 0;
  return { total, have, missing, duplicates, percentComplete };
}

type Props = {
  stickers: StickerWithCount[];
  initialStats: AlbumStats;
};

export function AlbumClient({ stickers, initialStats }: Props) {
  const t = useTranslations('Album');

  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(stickers.map((s) => [s.id, s.count])),
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const pendingRef = useRef(0);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleUpdate = useCallback((stickerId: string, count: number) => {
    setCounts((prev) => ({ ...prev, [stickerId]: count }));
    setSaveState('saving');

    clearTimeout(debounceTimers.current[stickerId]);
    pendingRef.current += 1;

    debounceTimers.current[stickerId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/album/stickers/${stickerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count }),
        });
        if (!res.ok) setSaveState('error');
      } catch {
        setSaveState('error');
      } finally {
        pendingRef.current -= 1;
        if (pendingRef.current === 0) {
          setSaveState((s) => (s !== 'error' ? 'saved' : 'error'));
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(
            () => setSaveState((s) => (s === 'saved' ? 'idle' : s)),
            2000,
          );
        }
      }
    }, 500);
  }, []);

  const stats = useMemo(() => computeStats(stickers, counts), [stickers, counts]);

  const grouped = useMemo(() => {
    const map = new Map<string, (StickerWithCount & { currentCount: number })[]>();
    for (const s of stickers) {
      if (!map.has(s.team)) map.set(s.team, []);
      map.get(s.team)!.push({ ...s, currentCount: counts[s.id] ?? s.count });
    }
    return map;
  }, [stickers, counts]);

  const saveLabel =
    saveState === 'saving'
      ? t('saving')
      : saveState === 'saved'
        ? t('saved')
        : saveState === 'error'
          ? t('saveError')
          : null;

  // Use initialStats only until first interaction to avoid SSR mismatch
  const displayStats = Object.values(counts).every((c, i) => c === stickers[i]?.count)
    ? initialStats
    : stats;

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-card border-border rounded-lg border p-3 text-center">
          <div className="text-primary text-2xl font-bold">{displayStats.have}</div>
          <div className="text-muted-foreground text-xs">{t('statsHave')}</div>
        </div>
        <div className="bg-card border-border rounded-lg border p-3 text-center">
          <div className="text-foreground text-2xl font-bold">{displayStats.missing}</div>
          <div className="text-muted-foreground text-xs">{t('statsMissing')}</div>
        </div>
        <div className="bg-card border-border rounded-lg border p-3 text-center">
          <div className="text-accent text-2xl font-bold">{displayStats.duplicates}</div>
          <div className="text-muted-foreground text-xs">{t('statsDuplicates')}</div>
        </div>
        <div className="bg-card border-border rounded-lg border p-3 text-center">
          <div className="text-foreground text-2xl font-bold">{displayStats.percentComplete}%</div>
          <div className="text-muted-foreground text-xs">{t('statsPercent')}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-muted mb-6 h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${displayStats.percentComplete}%` }}
          role="progressbar"
          aria-valuenow={displayStats.percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('progressLabel', { percent: displayStats.percentComplete })}
        />
      </div>

      {/* Hint */}
      <p className="text-muted-foreground mb-6 text-xs">{t('clickHint')}</p>

      {/* Grouped sticker grid */}
      {[...grouped.entries()].map(([team, teamStickers]) => (
        <div key={team} className="mb-8">
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            {team === 'FWC' ? t('teamFWC') : team}
          </h2>
          <div className="flex flex-wrap gap-2">
            {teamStickers.map((s) => (
              <StickerCell
                key={s.id}
                sticker={{ ...s, count: s.currentCount }}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Save indicator — floating bottom-right */}
      {saveLabel && (
        <div className="bg-card border-border text-muted-foreground fixed right-4 bottom-4 z-50 rounded-lg border px-4 py-2 text-sm shadow-md">
          {saveLabel}
        </div>
      )}
    </div>
  );
}
