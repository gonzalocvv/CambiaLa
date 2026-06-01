import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAlbumFindUnique = vi.hoisted(() => vi.fn());
const mockUserStickerUpsert = vi.hoisted(() => vi.fn());
const mockStickerFindUnique = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    album: { findUnique: mockAlbumFindUnique },
    userSticker: { upsert: mockUserStickerUpsert },
    sticker: { findUnique: mockStickerFindUnique },
  },
}));

import { stickerRepository } from '../sticker.repository';

beforeEach(() => vi.clearAllMocks());

const ALBUM_ID = 'album-1';
const USER_ID = 'user-1';
const STICKER_ID = 'sticker-1';

function makeDbSticker(overrides: object = {}) {
  return {
    id: STICKER_ID,
    albumId: ALBUM_ID,
    number: 'URU1',
    name: 'Suárez',
    team: 'URU',
    rarity: 'comun',
    isSpecial: false,
    userStickers: [],
    ...overrides,
  };
}

describe('stickerRepository.getAlbumWithUserCounts', () => {
  it('returns null when album not found', async () => {
    mockAlbumFindUnique.mockResolvedValue(null);
    const result = await stickerRepository.getAlbumWithUserCounts(USER_ID);
    expect(result).toBeNull();
  });

  it('returns albumId and stickers with count 0 when no userStickers', async () => {
    mockAlbumFindUnique.mockResolvedValue({
      id: ALBUM_ID,
      stickers: [makeDbSticker()],
    });

    const result = await stickerRepository.getAlbumWithUserCounts(USER_ID);

    expect(result).not.toBeNull();
    expect(result!.albumId).toBe(ALBUM_ID);
    expect(result!.stickers).toHaveLength(1);
    expect(result!.stickers[0].count).toBe(0);
    expect(result!.stickers[0].number).toBe('URU1');
  });

  it('returns sticker with count from userStickers when present', async () => {
    mockAlbumFindUnique.mockResolvedValue({
      id: ALBUM_ID,
      stickers: [makeDbSticker({ userStickers: [{ count: 3 }] })],
    });

    const result = await stickerRepository.getAlbumWithUserCounts(USER_ID);

    expect(result!.stickers[0].count).toBe(3);
  });

  it('maps rarity and isSpecial correctly', async () => {
    mockAlbumFindUnique.mockResolvedValue({
      id: ALBUM_ID,
      stickers: [makeDbSticker({ rarity: 'especial', isSpecial: true, userStickers: [] })],
    });

    const result = await stickerRepository.getAlbumWithUserCounts(USER_ID);

    expect(result!.stickers[0].rarity).toBe('especial');
    expect(result!.stickers[0].isSpecial).toBe(true);
  });
});

describe('stickerRepository.upsertUserStickerCount', () => {
  it('calls prisma.userSticker.upsert with correct args and returns count', async () => {
    mockUserStickerUpsert.mockResolvedValue({ count: 2 });

    const result = await stickerRepository.upsertUserStickerCount(USER_ID, STICKER_ID, 2);

    expect(mockUserStickerUpsert).toHaveBeenCalledOnce();
    const call = mockUserStickerUpsert.mock.calls[0][0];
    expect(call.where).toEqual({ userId_stickerId: { userId: USER_ID, stickerId: STICKER_ID } });
    expect(call.update).toEqual({ count: 2 });
    expect(call.create).toEqual({ userId: USER_ID, stickerId: STICKER_ID, count: 2 });
    expect(result).toEqual({ count: 2 });
  });
});

describe('stickerRepository.getStickerById', () => {
  it('returns sticker when found', async () => {
    mockStickerFindUnique.mockResolvedValue({ id: STICKER_ID, albumId: ALBUM_ID });

    const result = await stickerRepository.getStickerById(STICKER_ID);

    expect(result).toEqual({ id: STICKER_ID, albumId: ALBUM_ID });
  });

  it('returns null when not found', async () => {
    mockStickerFindUnique.mockResolvedValue(null);

    const result = await stickerRepository.getStickerById('nonexistent');

    expect(result).toBeNull();
  });
});
