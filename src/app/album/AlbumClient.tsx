'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { StickerCell } from '@/components/album/sticker-cell';
import type { AlbumStats, StickerWithCount } from '@/lib/validations/sticker.schema';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type FilterMode = 'all' | 'missing' | 'have' | 'duplicates' | 'specials';

// RF-213: una ráfaga de clicks se buffea y se manda en UN solo PATCH bulk.
const FLUSH_DELAY_MS = 800;
const SAVED_TOAST_MS = 2000;

type Change = { stickerId: string; count: number };

async function sendBulk(changes: Change[], keepalive = false): Promise<boolean> {
  const res = await fetch('/api/album/stickers', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes }),
    keepalive,
  });
  return res.ok;
}

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
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Buffer compartido (último count por figurita gana) + un solo timer global.
  const bufferRef = useRef<Map<string, number>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushingRef = useRef(false);
  const flushRef = useRef<() => void>(() => {});

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flushRef.current();
    }, FLUSH_DELAY_MS);
  }, []);

  const flush = useCallback(async () => {
    // Si ya hay un flush en vuelo, este no dispara otro: el que está corriendo
    // reprograma al terminar si quedaron cambios. Evita requests superpuestos.
    if (isFlushingRef.current || bufferRef.current.size === 0) return;

    isFlushingRef.current = true;
    const snapshot = [...bufferRef.current.entries()];
    const changes: Change[] = snapshot.map(([stickerId, count]) => ({ stickerId, count }));

    let ok = false;
    try {
      ok = (await sendBulk(changes)) || (await sendBulk(changes)); // 1 reintento
    } catch {
      ok = false;
    }

    if (ok) {
      // Borrar solo las keys del snapshot cuyo valor no cambió durante el vuelo
      // (preserva los clicks que entraron mientras volaba el request).
      for (const [stickerId, count] of snapshot) {
        if (bufferRef.current.get(stickerId) === count) bufferRef.current.delete(stickerId);
      }
    }
    isFlushingRef.current = false;

    if (!ok) {
      setSaveState('error'); // no se vacía el buffer: se reintenta en el próximo flush
    } else if (bufferRef.current.size > 0) {
      scheduleFlush(); // entraron cambios durante el vuelo
    } else {
      setSaveState('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(
        () => setSaveState((s) => (s === 'saved' ? 'idle' : s)),
        SAVED_TOAST_MS,
      );
    }
  }, [scheduleFlush]);

  useEffect(() => {
    flushRef.current = () => void flush();
  }, [flush]);

  // Flush best-effort al ocultar/cerrar la pestaña (no perder cambios sin guardar).
  useEffect(() => {
    const flushOnClose = () => {
      if (bufferRef.current.size === 0) return;
      const changes: Change[] = [...bufferRef.current.entries()].map(([stickerId, count]) => ({
        stickerId,
        count,
      }));
      bufferRef.current.clear();
      void sendBulk(changes, true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushOnClose();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushOnClose);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushOnClose);
    };
  }, []);

  const handleUpdate = useCallback(
    (stickerId: string, count: number) => {
      setCounts((prev) => ({ ...prev, [stickerId]: count }));
      bufferRef.current.set(stickerId, count);
      setSaveState('saving');
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const stats = useMemo(() => computeStats(stickers, counts), [stickers, counts]);

  // Unique teams preserving the natural order from the stickers list
  const teams = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const s of stickers) {
      if (!seen.has(s.team)) {
        seen.add(s.team);
        result.push(s.team);
      }
    }
    return result;
  }, [stickers]);

  // Filtered stickers based on tab + team + search
  const filteredStickers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return stickers.filter((s) => {
      const count = counts[s.id] ?? s.count;
      if (activeFilter === 'missing' && count !== 0) return false;
      if (activeFilter === 'have' && count < 1) return false;
      if (activeFilter === 'duplicates' && count < 2) return false;
      if (activeFilter === 'specials' && !s.isSpecial) return false;
      if (selectedTeam && s.team !== selectedTeam) return false;
      if (query) {
        const matchesNumber = s.number.toLowerCase().includes(query);
        const matchesName = s.name?.toLowerCase().includes(query) ?? false;
        if (!matchesNumber && !matchesName) return false;
      }
      return true;
    });
  }, [stickers, counts, activeFilter, selectedTeam, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, (StickerWithCount & { currentCount: number })[]>();
    for (const s of filteredStickers) {
      if (!map.has(s.team)) map.set(s.team, []);
      map.get(s.team)!.push({ ...s, currentCount: counts[s.id] ?? s.count });
    }
    return map;
  }, [filteredStickers, counts]);

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

  const filterTabs: { key: FilterMode; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'missing', label: t('filterMissing') },
    { key: 'have', label: t('filterHave') },
    { key: 'duplicates', label: t('filterDuplicates') },
    { key: 'specials', label: t('filterSpecials') },
  ];

  const hasActiveFilter =
    activeFilter !== 'all' || selectedTeam !== '' || searchQuery.trim() !== '';

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

      {/* Search input — RF-205 */}
      <div className="relative mb-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:outline-none"
          aria-label={t('searchPlaceholder')}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            aria-label={t('searchClear')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter tabs — RF-204 */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              activeFilter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Team filter dropdown — RF-204 */}
      <div className="mb-6 flex items-center gap-2">
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="border-border bg-card text-foreground focus:ring-primary flex-1 rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
          aria-label={t('teamFilterAll')}
        >
          <option value="">{t('teamFilterAll')}</option>
          {teams.map((team) => (
            <option key={team} value={team}>
              {team === 'FWC' ? t('teamFWC') : team}
            </option>
          ))}
        </select>
        {hasActiveFilter && (
          <button
            onClick={() => {
              setActiveFilter('all');
              setSelectedTeam('');
              setSearchQuery('');
            }}
            className="text-muted-foreground hover:text-foreground shrink-0 text-sm"
          >
            {t('filterAll')} ✕
          </button>
        )}
      </div>

      {/* Hint */}
      <p className="text-muted-foreground mb-6 text-xs">{t('clickHint')}</p>

      {/* Empty state */}
      {grouped.size === 0 && (
        <p className="text-muted-foreground py-12 text-center text-sm">{t('emptyFilter')}</p>
      )}

      {/* Results count when filtering */}
      {hasActiveFilter && grouped.size > 0 && (
        <p className="text-muted-foreground mb-4 text-xs">
          {t('resultsCount', { count: filteredStickers.length })}
        </p>
      )}

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
