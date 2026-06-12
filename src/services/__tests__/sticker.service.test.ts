import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  getAlbumWithUserCounts: vi.fn(),
  getExistingStickerIds: vi.fn(),
  bulkUpsertCounts: vi.fn(),
}));

// RF-307: sticker.service ahora encola el evento en Inngest en vez de llamar
// directamente a matchService. Mockeamos el cliente para verificar el encolado.
const mockInngest = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue(undefined),
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/repositories/sticker.repository', () => ({
  stickerRepository: mockRepo,
}));

vi.mock('@/inngest/client', () => ({
  inngest: mockInngest,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

import { stickerService } from '../sticker.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockInngest.send.mockResolvedValue(undefined);
});

const USER_ID = 'user-1';
const STICKER_ID = 'sticker-1';
const ALBUM_ID = 'album-1';

function makeSticker(overrides: object = {}) {
  return {
    id: STICKER_ID,
    number: 'URU1',
    name: 'Suárez',
    team: 'URU',
    rarity: 'comun' as const,
    isSpecial: false,
    count: 0,
    ...overrides,
  };
}

describe('stickerService.getUserAlbum', () => {
  it('returns null when album not found', async () => {
    mockRepo.getAlbumWithUserCounts.mockResolvedValue(null);
    const result = await stickerService.getUserAlbum(USER_ID);
    expect(result).toBeNull();
  });

  it('returns album with computed stats', async () => {
    mockRepo.getAlbumWithUserCounts.mockResolvedValue({
      albumId: ALBUM_ID,
      stickers: [
        makeSticker({ count: 0 }),
        makeSticker({ id: 's2', count: 1 }),
        makeSticker({ id: 's3', count: 3 }),
      ],
    });

    const result = await stickerService.getUserAlbum(USER_ID);

    expect(result).not.toBeNull();
    expect(result!.albumId).toBe(ALBUM_ID);
    expect(result!.stats.total).toBe(3);
    expect(result!.stats.have).toBe(2);
    expect(result!.stats.missing).toBe(1);
    expect(result!.stats.duplicates).toBe(1);
    expect(result!.stats.percentComplete).toBe(67);
  });

  it('computes 0% when all stickers are missing', async () => {
    mockRepo.getAlbumWithUserCounts.mockResolvedValue({
      albumId: ALBUM_ID,
      stickers: [makeSticker({ count: 0 }), makeSticker({ id: 's2', count: 0 })],
    });

    const result = await stickerService.getUserAlbum(USER_ID);
    expect(result!.stats.percentComplete).toBe(0);
    expect(result!.stats.have).toBe(0);
    expect(result!.stats.missing).toBe(2);
  });

  it('computes 0% when stickers array is empty', async () => {
    mockRepo.getAlbumWithUserCounts.mockResolvedValue({
      albumId: ALBUM_ID,
      stickers: [],
    });

    const result = await stickerService.getUserAlbum(USER_ID);
    expect(result!.stats.percentComplete).toBe(0);
    expect(result!.stats.total).toBe(0);
  });

  it('computes 100% when all stickers are present', async () => {
    mockRepo.getAlbumWithUserCounts.mockResolvedValue({
      albumId: ALBUM_ID,
      stickers: [makeSticker({ count: 1 }), makeSticker({ id: 's2', count: 2 })],
    });

    const result = await stickerService.getUserAlbum(USER_ID);
    expect(result!.stats.percentComplete).toBe(100);
    expect(result!.stats.have).toBe(2);
    expect(result!.stats.duplicates).toBe(1);
  });
});

describe('stickerService.bulkUpdateCounts', () => {
  it('dedupes repeated stickerIds keeping the last count', async () => {
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set(['s1']));

    const result = await stickerService.bulkUpdateCounts(USER_ID, [
      { stickerId: 's1', count: 1 },
      { stickerId: 's1', count: 5 },
    ]);

    expect(mockRepo.getExistingStickerIds).toHaveBeenCalledWith(['s1']);
    expect(mockRepo.bulkUpsertCounts).toHaveBeenCalledWith(USER_ID, [
      { stickerId: 's1', count: 5 },
    ]);
    expect(result).toEqual({ applied: 1, ignored: 0 });
  });

  it('ignores stickerIds not in the catalog and reports them', async () => {
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set(['s1']));

    const result = await stickerService.bulkUpdateCounts(USER_ID, [
      { stickerId: 's1', count: 2 },
      { stickerId: 'ghost', count: 3 },
    ]);

    expect(mockRepo.bulkUpsertCounts).toHaveBeenCalledWith(USER_ID, [
      { stickerId: 's1', count: 2 },
    ]);
    expect(result).toEqual({ applied: 1, ignored: 1 });
  });

  it('does not write when all stickerIds are ignored', async () => {
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set());

    const result = await stickerService.bulkUpdateCounts(USER_ID, [
      { stickerId: 'ghost', count: 1 },
    ]);

    expect(mockRepo.bulkUpsertCounts).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: 0, ignored: 1 });
  });

  it('applies multiple valid changes (happy path) with count 0 and 99 passthrough', async () => {
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set(['s1', 's2']));

    const result = await stickerService.bulkUpdateCounts(USER_ID, [
      { stickerId: 's1', count: 0 },
      { stickerId: 's2', count: 99 },
    ]);

    expect(mockRepo.bulkUpsertCounts).toHaveBeenCalledWith(USER_ID, [
      { stickerId: 's1', count: 0 },
      { stickerId: 's2', count: 99 },
    ]);
    expect(result).toEqual({ applied: 2, ignored: 0 });
  });

  it('dedupe intercalado: preserva orden de 1ra aparición con el último valor', async () => {
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set(['a', 'b']));

    const result = await stickerService.bulkUpdateCounts(USER_ID, [
      { stickerId: 'a', count: 1 },
      { stickerId: 'b', count: 2 },
      { stickerId: 'a', count: 3 },
    ]);

    expect(mockRepo.getExistingStickerIds).toHaveBeenCalledWith(['a', 'b']);
    expect(mockRepo.bulkUpsertCounts).toHaveBeenCalledWith(USER_ID, [
      { stickerId: 'a', count: 3 },
      { stickerId: 'b', count: 2 },
    ]);
    expect(result).toEqual({ applied: 2, ignored: 0 });
  });

  it('aplica 200 cambios válidos en una sola llamada al repo', async () => {
    const ids = Array.from({ length: 200 }, (_, i) => `s${i}`);
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set(ids));

    const changes = ids.map((stickerId, i) => ({ stickerId, count: i % 100 }));
    const result = await stickerService.bulkUpdateCounts(USER_ID, changes);

    expect(mockRepo.bulkUpsertCounts).toHaveBeenCalledOnce();
    expect(mockRepo.bulkUpsertCounts.mock.calls[0][1]).toHaveLength(200);
    expect(result).toEqual({ applied: 200, ignored: 0 });
  });

  // RF-307: el recompute se encola en Inngest (evento 'match/recompute') en vez de ejecutarse
  // síncronamente en el request. Verificamos que inngest.send se llama con los parámetros correctos.
  it('enqueues a match/recompute Inngest event after a successful flush (applied > 0)', async () => {
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set(['s1']));

    await stickerService.bulkUpdateCounts(USER_ID, [{ stickerId: 's1', count: 2 }]);

    expect(mockInngest.send).toHaveBeenCalledOnce();
    expect(mockInngest.send).toHaveBeenCalledWith({
      name: 'match/recompute',
      data: { userId: USER_ID },
    });
  });

  it('does NOT enqueue recompute event when nothing was applied (all ids ignored)', async () => {
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set());

    const result = await stickerService.bulkUpdateCounts(USER_ID, [
      { stickerId: 'ghost', count: 1 },
    ]);

    expect(result).toEqual({ applied: 0, ignored: 1 });
    expect(mockInngest.send).not.toHaveBeenCalled();
  });

  it('logs and swallows inngest.send failure without failing the album save', async () => {
    mockRepo.getExistingStickerIds.mockResolvedValue(new Set(['s1']));
    mockInngest.send.mockRejectedValue(new Error('inngest down'));

    const result = await stickerService.bulkUpdateCounts(USER_ID, [{ stickerId: 's1', count: 1 }]);

    // album write still succeeded; enqueue failure is logged, not thrown
    expect(result).toEqual({ applied: 1, ignored: 0 });
    expect(mockRepo.bulkUpsertCounts).toHaveBeenCalledOnce();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'inngest send match/recompute failed',
      expect.objectContaining({ userId: USER_ID, error: 'inngest down' }),
    );
  });
});
