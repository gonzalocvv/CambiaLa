import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAlbumPrisma = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { album: mockAlbumPrisma },
}));

import { albumRepository } from '../album.repository';

beforeEach(() => vi.clearAllMocks());

describe('albumRepository.findActiveAlbum', () => {
  it('queries the active album ordered by releasedAt desc', async () => {
    const album = { id: 'album-1', slug: 'mundial-2026', isActive: true };
    mockAlbumPrisma.findFirst.mockResolvedValue(album);

    const result = await albumRepository.findActiveAlbum();

    expect(mockAlbumPrisma.findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { releasedAt: 'desc' },
    });
    expect(result).toEqual(album);
  });

  it('returns null when there is no active album', async () => {
    mockAlbumPrisma.findFirst.mockResolvedValue(null);
    expect(await albumRepository.findActiveAlbum()).toBeNull();
  });
});
