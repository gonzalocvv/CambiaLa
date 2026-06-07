import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  getAlbumWithUserCounts: vi.fn(),
  getExistingStickerIds: vi.fn(),
  bulkUpsertCounts: vi.fn(),
}));

vi.mock('@/repositories/sticker.repository', () => ({
  stickerRepository: mockRepo,
}));

import { stickerService } from '../sticker.service';

beforeEach(() => vi.clearAllMocks());

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
});
