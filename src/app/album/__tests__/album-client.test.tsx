import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AlbumStats, StickerWithCount } from '@/lib/validations/sticker.schema';
import { renderWithIntl } from '@/test/render-intl';

import { AlbumClient, STORAGE_KEY, chunkChanges } from '../album-client';

type Change = { stickerId: string; count: number };

function makeStickers(n: number): StickerWithCount[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `id${i}`,
    number: `S${i}`,
    name: null,
    team: 'URU',
    rarity: 'comun' as const,
    isSpecial: false,
    count: 0,
  }));
}

function statsFor(n: number): AlbumStats {
  return { total: n, have: 0, missing: n, duplicates: 0, percentComplete: 0 };
}

function okResp(ignored = 0) {
  return { ok: true, status: 200, json: async () => ({ ok: true, applied: 1, ignored }) };
}

function cell(number: string) {
  return screen.getByRole('button', { name: new RegExp(`^${number},`) });
}

function bodyOf(call: unknown[]): { changes: Change[] } {
  const opts = call[1] as { body: string };
  return JSON.parse(opts.body);
}

function setup(n = 3) {
  return renderWithIntl(<AlbumClient stickers={makeStickers(n)} initialStats={statsFor(n)} />);
}

describe('chunkChanges', () => {
  it('parte en lotes de 200 (201 → [200, 1])', () => {
    const entries = Array.from({ length: 201 }, (_, i) => [`id${i}`, 1] as [string, number]);
    const chunks = chunkChanges(entries);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(200);
    expect(chunks[1]).toHaveLength(1);
    expect(chunks[0][0]).toEqual({ stickerId: 'id0', count: 1 });
  });

  it('lista vacía → []', () => {
    expect(chunkChanges([])).toEqual([]);
  });
});

describe('AlbumClient — guardado en bulk', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('agrupa una ráfaga de clicks en un solo PATCH bulk', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);
    setup(3);

    fireEvent.click(cell('S0'));
    fireEvent.click(cell('S1'));
    fireEvent.click(cell('S2'));
    expect(fetchMock).not.toHaveBeenCalled(); // debounce: aún no salió

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = bodyOf(fetchMock.mock.calls[0]);
    expect(body.changes).toHaveLength(3);
    expect(new Set(body.changes.map((c) => c.stickerId))).toEqual(new Set(['id0', 'id1', 'id2']));
  });

  it('reintenta una vez ante un throw de red y se recupera (M1)', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);
    setup(1);

    fireEvent.click(cell('S0'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Error al guardar')).toBeNull();
  });

  it('reintenta ante 5xx', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);
    setup(1);

    fireEvent.click(cell('S0'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Error al guardar')).toBeNull();
  });

  it('ante 4xx no reintenta y muestra error (purga el cambio veneno) (M2)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    setup(2);

    fireEvent.click(cell('S0'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1); // 4xx NO se reintenta
    expect(screen.queryByText('Error al guardar')).not.toBeNull();
  });

  it('error persistente con botón Reintentar que reenvía (H6/M6)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('net'));
    vi.stubGlobal('fetch', fetchMock);
    setup(1);

    fireEvent.click(cell('S0'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2); // intento + reintento, ambos fallan
    expect(screen.queryByText('Error al guardar')).not.toBeNull();

    fetchMock.mockResolvedValue(okResp()); // la red se recupera
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(fetchMock).toHaveBeenCalledTimes(3); // reenvío manual
    expect(screen.queryByText('Error al guardar')).toBeNull();
  });

  it('al desmontar manda el remanente del buffer con keepalive (H2)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);
    const { unmount } = setup(1);

    fireEvent.click(cell('S0')); // buffer tiene id0; el flush de 800ms aún no disparó
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const opts = fetchMock.mock.calls[0][1] as { keepalive?: boolean };
    expect(opts.keepalive).toBe(true);
    expect(bodyOf(fetchMock.mock.calls[0]).changes).toEqual([{ stickerId: 'id0', count: 1 }]);
  });

  it('no pierde clicks que entran durante un flush en vuelo (L9)', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    const firstPromise = new Promise((res) => {
      resolveFirst = res;
    });
    const fetchMock = vi.fn().mockReturnValueOnce(firstPromise).mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);
    setup(2);

    fireEvent.click(cell('S0'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900); // flush #1 dispara; fetch #1 queda pendiente
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(cell('S1')); // entra DURANTE el vuelo

    await act(async () => {
      resolveFirst(okResp());
      await vi.advanceTimersByTimeAsync(900); // resuelve flush #1 y dispara flush #2
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body2 = bodyOf(fetchMock.mock.calls[1]);
    expect(body2.changes.some((c) => c.stickerId === 'id1')).toBe(true); // S1 no se perdió
  });
});

describe('AlbumClient — persistencia localStorage (RF-340)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('persiste el buffer en localStorage tras cada click', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);
    setup(2);

    fireEvent.click(cell('S0'));

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({ id0: 1 });
  });

  it('rehidrata el buffer de localStorage al montar y dispara el flush', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id0: 1, id1: 2 }));
    const fetchMock = vi.fn().mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);

    setup(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = bodyOf(fetchMock.mock.calls[0]);
    expect(body.changes.some((c: Change) => c.stickerId === 'id0' && c.count === 1)).toBe(true);
    expect(body.changes.some((c: Change) => c.stickerId === 'id1' && c.count === 2)).toBe(true);
  });

  it('limpia localStorage tras un flush exitoso', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id0: 1 }));
    const fetchMock = vi.fn().mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);

    setup(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('AlbumClient — displayStats (RF-339)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('muestra initialStats en la barra de progreso antes de interactuar', () => {
    const stickers = makeStickers(2);
    const initial: AlbumStats = {
      total: 2,
      have: 0,
      missing: 2,
      duplicates: 0,
      percentComplete: 75,
    };
    renderWithIntl(<AlbumClient stickers={stickers} initialStats={initial} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('cambia a stats en vivo tras el primer click', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(okResp());
    vi.stubGlobal('fetch', fetchMock);
    // makeStickers(2): all count=0 → after 1 click live percentComplete = 50
    const stickers = makeStickers(2);
    const initial: AlbumStats = {
      total: 2,
      have: 0,
      missing: 2,
      duplicates: 0,
      percentComplete: 75,
    };
    renderWithIntl(<AlbumClient stickers={stickers} initialStats={initial} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');

    await act(async () => {
      fireEvent.click(cell('S0'));
    });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });
});

describe('AlbumClient — team header (RF-215)', () => {
  it('renders the full Spanish country name with flag in team section headings', () => {
    const stickers: StickerWithCount[] = [
      {
        id: 'a1',
        number: 'URU1',
        name: 'Valverde',
        team: 'URU',
        rarity: 'comun',
        isSpecial: false,
        count: 0,
      },
      {
        id: 'a2',
        number: 'ARG1',
        name: 'Messi',
        team: 'ARG',
        rarity: 'comun',
        isSpecial: false,
        count: 1,
      },
    ];
    const stats: AlbumStats = { total: 2, have: 1, missing: 1, duplicates: 0, percentComplete: 50 };
    renderWithIntl(<AlbumClient stickers={stickers} initialStats={stats} />);

    // heading + dropdown option both show the full display — getAllByText finds both
    expect(screen.getAllByText('🇺🇾 Uruguay · URU').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('🇦🇷 Argentina · ARG').length).toBeGreaterThanOrEqual(1);
    // Verify the h2 heading specifically
    const headings = screen.getAllByRole('heading', { level: 2 });
    const headingTexts = headings.map((h) => h.textContent);
    expect(headingTexts).toContain('🇺🇾 Uruguay · URU');
    expect(headingTexts).toContain('🇦🇷 Argentina · ARG');
  });

  it('renders FWC team with trophy emoji and full name in heading', () => {
    const stickers: StickerWithCount[] = [
      {
        id: 'f1',
        number: 'FWC1',
        name: 'Logo',
        team: 'FWC',
        rarity: 'comun',
        isSpecial: false,
        count: 0,
      },
    ];
    const stats: AlbumStats = { total: 1, have: 0, missing: 1, duplicates: 0, percentComplete: 0 };
    renderWithIntl(<AlbumClient stickers={stickers} initialStats={stats} />);

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((h) => h.textContent)).toContain('🏆 Copa del Mundo');
  });
});
