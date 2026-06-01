import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  getAlbumWithUserCounts: vi.fn(),
  upsertUserStickerCount: vi.fn(),
  getStickerById: vi.fn(),
}));

vi.mock('@/repositories/sticker.repository', () => ({
  stickerRepository: mockRepo,
}));

import { StickerNotFoundError, stickerService } from '../sticker.service';

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

describe('stickerService.updateStickerCount', () => {
  it('updates count when sticker exists', async () => {
    mockRepo.getStickerById.mockResolvedValue({ id: STICKER_ID, albumId: ALBUM_ID });
    mockRepo.upsertUserStickerCount.mockResolvedValue({ count: 2 });

    const result = await stickerService.updateStickerCount(USER_ID, STICKER_ID, 2);

    expect(result).toEqual({ count: 2 });
    expect(mockRepo.upsertUserStickerCount).toHaveBeenCalledWith(USER_ID, STICKER_ID, 2);
  });

  it('throws StickerNotFoundError when sticker does not exist', async () => {
    mockRepo.getStickerById.mockResolvedValue(null);

    await expect(stickerService.updateStickerCount(USER_ID, 'bad-id', 1)).rejects.toBeInstanceOf(
      StickerNotFoundError,
    );
    expect(mockRepo.upsertUserStickerCount).not.toHaveBeenCalled();
  });
});
