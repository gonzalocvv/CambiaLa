import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAlbumFindUnique = vi.hoisted(() => vi.fn());
const mockStickerFindMany = vi.hoisted(() => vi.fn());
const mockExecuteRaw = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    album: { findUnique: mockAlbumFindUnique },
    sticker: { findMany: mockStickerFindMany },
    $executeRaw: mockExecuteRaw,
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

describe('stickerRepository.getExistingStickerIds', () => {
  it('scopes the query to the mundial-2026 album', async () => {
    mockStickerFindMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const result = await stickerRepository.getExistingStickerIds(['a', 'b', 'c']);

    expect(mockStickerFindMany).toHaveBeenCalledOnce();
    expect(mockStickerFindMany.mock.calls[0][0].where).toEqual({
      id: { in: ['a', 'b', 'c'] },
      album: { slug: 'mundial-2026' },
    });
    expect(result).toEqual(new Set(['a', 'b']));
  });

  it('returns an empty Set when none exist in the album', async () => {
    mockStickerFindMany.mockResolvedValue([]);

    const result = await stickerRepository.getExistingStickerIds(['x']);

    expect(result.size).toBe(0);
  });

  it('returns empty Set when sticker ids belong to a different album (mock returns empty)', async () => {
    // Simulates: sticker 'foreign-1' exists in another album but NOT in mundial-2026
    mockStickerFindMany.mockResolvedValue([]);

    const result = await stickerRepository.getExistingStickerIds(['foreign-1']);

    expect(result.size).toBe(0);
    // The where clause must include the album scope — verified in the first test
    expect(mockStickerFindMany.mock.calls[0][0].where.album).toEqual({ slug: 'mundial-2026' });
  });
});

describe('stickerRepository.bulkUpsertCounts', () => {
  it('issues exactly ONE $executeRaw with well-formed array params', async () => {
    mockExecuteRaw.mockResolvedValue(2);

    await stickerRepository.bulkUpsertCounts(USER_ID, [
      { stickerId: 'a', count: 1 },
      { stickerId: 'b', count: 0 },
    ]);

    expect(mockExecuteRaw).toHaveBeenCalledOnce();
    // Tagged template: call = [strings, userId, ids, stickerIds, counts]
    const call = mockExecuteRaw.mock.calls[0];
    const [, userId, ids, stickerIds, counts] = call;
    expect(userId).toBe(USER_ID);
    expect(Array.isArray(ids)).toBe(true);
    expect(ids).toHaveLength(2);
    expect(ids.every((id: unknown) => typeof id === 'string' && (id as string).length > 0)).toBe(
      true,
    );
    expect(new Set(ids).size).toBe(2); // generated ids are unique
    expect(stickerIds).toEqual(['a', 'b']);
    expect(counts).toEqual([1, 0]);
  });

  it('ordena por stickerId y mantiene la alineación posicional ids/stickerIds/counts', async () => {
    mockExecuteRaw.mockResolvedValue(3);

    await stickerRepository.bulkUpsertCounts(USER_ID, [
      { stickerId: 'c', count: 3 },
      { stickerId: 'a', count: 1 },
      { stickerId: 'b', count: 2 },
    ]);

    const [, userId, ids, stickerIds, counts] = mockExecuteRaw.mock.calls[0];
    expect(userId).toBe(USER_ID);
    expect(stickerIds).toEqual(['a', 'b', 'c']); // ordenado
    expect(counts).toEqual([1, 2, 3]); // alineado al orden ordenado de stickerIds
    expect(ids).toHaveLength(3);
  });

  it('no llama a $executeRaw con un array vacío (guard N6)', async () => {
    await stickerRepository.bulkUpsertCounts(USER_ID, []);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });
});
