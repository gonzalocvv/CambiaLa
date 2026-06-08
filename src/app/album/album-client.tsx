'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { StickerCell } from '@/components/album/sticker-cell';
import { getTeamDisplay } from '@/lib/team-names';
import type { AlbumStats, StickerWithCount } from '@/lib/validations/sticker.schema';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type FilterMode = 'all' | 'missing' | 'have' | 'duplicates' | 'specials';

// RF-213: una ráfaga de clicks se buffea y se manda en PATCH bulk.
// L12: 800ms (vs 500 del flujo viejo) agrupa ráfagas más largas en un solo request;
// el optimistic UI ya da feedback <200ms, así que la latencia extra de confirmación no se nota.
const FLUSH_DELAY_MS = 800;

// RF-340: clave de localStorage para el buffer pendiente.
export const STORAGE_KEY = 'cambiala:album:pending-buffer';

// Persiste el buffer en localStorage. No-op si localStorage no está disponible.
export function persistBuffer(buffer: Map<string, number>): void {
  try {
    if (buffer.size === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(buffer)));
    }
  } catch {
    // localStorage puede no estar disponible (private browsing, cuota, SSR)
  }
}

// Carga el buffer persistido. Valida el shape para ignorar datos corruptos o de otra sesión.
export function loadPersistedBuffer(): Map<string, number> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(obj)
      .filter(([, v]) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 99)
      .map(([k, v]) => [k, v as number] as const);
    return entries.length > 0 ? new Map(entries) : null;
  } catch {
    return null;
  }
}
const SAVED_TOAST_MS = 2000;
const ERROR_RETRY_MS = 5000; // H6/L1: un reintento automático con backoff tras un fallo reintentable
const MAX_CHANGES_PER_REQUEST = 200; // = cap del schema; el buffer se parte en lotes (H1)

type Change = { stickerId: string; count: number };
type SendResult = { ok: boolean; status: number; ignored: number };

// Un intento de envío. Un throw de red NO rompe: devuelve status 0 (reintentable). M1.
async function sendOnce(changes: Change[], keepalive = false): Promise<SendResult> {
  try {
    const res = await fetch('/api/album/stickers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
      keepalive,
    });
    let ignored = 0;
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { ignored?: number } | null;
      ignored = data?.ignored ?? 0;
    }
    return { ok: res.ok, status: res.status, ignored };
  } catch {
    return { ok: false, status: 0, ignored: 0 };
  }
}

export function chunkChanges(entries: [string, number][]): Change[][] {
  const out: Change[][] = [];
  for (let i = 0; i < entries.length; i += MAX_CHANGES_PER_REQUEST) {
    out.push(
      entries
        .slice(i, i + MAX_CHANGES_PER_REQUEST)
        .map(([stickerId, count]) => ({ stickerId, count })),
    );
  }
  return out;
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
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Buffer compartido (último count por figurita gana) + un solo timer global.
  const bufferRef = useRef<Map<string, number>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushingRef = useRef(false);
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const backoffUsedRef = useRef(false);
  const flushRef = useRef<() => void>(() => {});

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flushRef.current();
    }, FLUSH_DELAY_MS);
  }, []);

  // H6/L1: un ÚNICO reintento automático con backoff tras un fallo reintentable; después queda el error.
  const scheduleBackoffRetry = useCallback(() => {
    if (backoffUsedRef.current) return;
    backoffUsedRef.current = true;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      void flushRef.current();
    }, ERROR_RETRY_MS);
  }, []);

  const flush = useCallback(async () => {
    // Guard: si ya hay un flush en vuelo, este no dispara otro (evita requests superpuestos).
    if (isFlushingRef.current || bufferRef.current.size === 0) return;

    isFlushingRef.current = true;
    const snapshot = [...bufferRef.current.entries()];
    inFlightKeysRef.current = new Set(snapshot.map(([k]) => k));

    let retryableFailure = false; // 5xx / red → conservar y reintentar
    let deterministicFailure = false; // 4xx → purgar el snapshot (no se arregla reintentando)
    let ignoredThisFlush = 0;

    // H1: el buffer se parte en lotes de ≤200 (el server capea en 200) y se envían en orden.
    for (const changes of chunkChanges(snapshot)) {
      // M1: cada intento captura su propio throw; reintenta solo si es reintentable (red/5xx).
      let r = await sendOnce(changes);
      if (!r.ok && (r.status === 0 || r.status >= 500)) r = await sendOnce(changes);

      if (r.ok) {
        ignoredThisFlush += r.ignored;
        // Borrar solo las keys cuyo valor no cambió durante el vuelo (preserva clicks en vuelo).
        for (const { stickerId, count } of changes) {
          if (bufferRef.current.get(stickerId) === count) bufferRef.current.delete(stickerId);
        }
        persistBuffer(bufferRef.current);
      } else if (r.status >= 400 && r.status < 500) {
        // M2: 4xx determinístico → purgar el snapshot para no atascar el buffer.
        for (const { stickerId, count } of changes) {
          if (bufferRef.current.get(stickerId) === count) bufferRef.current.delete(stickerId);
        }
        persistBuffer(bufferRef.current);
        deterministicFailure = true;
      } else {
        retryableFailure = true;
      }
    }

    inFlightKeysRef.current = new Set();
    isFlushingRef.current = false;
    setIgnoredCount(ignoredThisFlush);

    if (retryableFailure || deterministicFailure) {
      setSaveState('error');
      if (retryableFailure) scheduleBackoffRetry();
    } else if (bufferRef.current.size > 0) {
      backoffUsedRef.current = false;
      scheduleFlush(); // entraron cambios durante el vuelo
    } else {
      backoffUsedRef.current = false;
      setSaveState('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(
        () => setSaveState((s) => (s === 'saved' ? 'idle' : s)),
        SAVED_TOAST_MS,
      );
    }
  }, [scheduleFlush, scheduleBackoffRetry]);

  useEffect(() => {
    flushRef.current = () => void flush();
  }, [flush]);

  // Visibilidad/cierre: NUNCA vaciar el buffer antes de confirmar (H5/M4/L9/N3).
  useEffect(() => {
    const onVisibility = () => {
      // Tab oculta (cambiar de pestaña / minimizar en mobile, muy común): flush normal
      // awaiteable, respeta el guard y solo borra lo confirmado.
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => {
      // Cierre real: best-effort con keepalive, SIN vaciar el buffer, y solo las keys que NO
      // están en un flush en vuelo (L2). Si la página sobrevive (bfcache), el buffer queda intacto.
      if (bufferRef.current.size === 0) return;
      const entries = [...bufferRef.current.entries()].filter(
        ([k]) => !inFlightKeysRef.current.has(k),
      );
      for (const changes of chunkChanges(entries)) void sendOnce(changes, true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flush]);

  // RF-340: al montar, rehidratar el buffer desde localStorage y disparar el flush si hay cambios
  // pendientes (tab cerrado antes del debounce de 800ms). Solo toca refs y scheduleFlush —
  // no llama a setState para cumplir con react-hooks/set-state-in-effect. Los counts del servidor
  // se mostrarán hasta que el flush se confirme; los cambios no se pierden.
  useEffect(() => {
    const persisted = loadPersistedBuffer();
    if (!persisted || persisted.size === 0) return;
    for (const [id, count] of persisted) {
      bufferRef.current.set(id, count);
    }
    scheduleFlush();
  }, [scheduleFlush]);

  // H2: al desmontar (navegación SPA, la página sigue viva) limpiar timers y mandar el remanente.
  useEffect(() => {
    const buffer = bufferRef.current; // Map de identidad estable durante toda la vida del componente
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (buffer.size > 0) {
        for (const changes of chunkChanges([...buffer.entries()])) {
          void sendOnce(changes, true);
        }
      }
    };
  }, []);

  const handleUpdate = useCallback(
    (stickerId: string, count: number) => {
      setCounts((prev) => ({ ...prev, [stickerId]: count }));
      bufferRef.current.set(stickerId, count);
      persistBuffer(bufferRef.current);
      setSaveState('saving');
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // M6: botón "Reintentar" del estado de error persistente.
  const handleRetry = useCallback(() => {
    backoffUsedRef.current = false;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setSaveState('saving');
    void flushRef.current();
  }, []);

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

  // El error se muestra en un banner persistente con "Reintentar" (M6), no como toast.
  const saveLabel =
    saveState === 'saving' ? t('saving') : saveState === 'saved' ? t('saved') : null;

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
          <div className="text-accent-text text-2xl font-bold">{displayStats.duplicates}</div>
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
              {getTeamDisplay(team)}
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
            {getTeamDisplay(team)}
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

      {/* Save indicator — floating bottom-right. Error = persistente con Reintentar (M6). */}
      {(saveLabel || saveState === 'error' || ignoredCount > 0) && (
        <div className="bg-card border-border fixed right-4 bottom-4 z-50 max-w-xs rounded-lg border px-4 py-2 text-sm shadow-md">
          {saveState === 'error' ? (
            <div className="flex items-center gap-3">
              <span className="text-destructive font-medium">{t('saveError')}</span>
              <button
                onClick={handleRetry}
                className="bg-primary text-primary-foreground shrink-0 rounded-md px-2 py-1 text-xs font-medium"
              >
                {t('retry')}
              </button>
            </div>
          ) : (
            saveLabel && <span className="text-muted-foreground">{saveLabel}</span>
          )}
          {ignoredCount > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">
              {t('ignoredNotice', { count: ignoredCount })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
