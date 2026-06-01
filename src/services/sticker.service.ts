import type { AlbumStats, GetAlbumResponse } from '@/lib/validations/sticker.schema';
import { stickerRepository } from '@/repositories/sticker.repository';

export class StickerNotFoundError extends Error {
  constructor() {
    super('Sticker not found');
    this.name = 'StickerNotFoundError';
  }
}

function computeStats(stickers: { count: number }[]): AlbumStats {
  const total = stickers.length;
  const have = stickers.filter((s) => s.count >= 1).length;
  const missing = stickers.filter((s) => s.count === 0).length;
  const duplicates = stickers.filter((s) => s.count >= 2).length;
  const percentComplete = total > 0 ? Math.round((have / total) * 100) : 0;
  return { total, have, missing, duplicates, percentComplete };
}

export const stickerService = {
  async getUserAlbum(userId: string): Promise<GetAlbumResponse | null> {
    const data = await stickerRepository.getAlbumWithUserCounts(userId);
    if (!data) return null;
    const stats = computeStats(data.stickers);
    return { albumId: data.albumId, stickers: data.stickers, stats };
  },

  async updateStickerCount(
    userId: string,
    stickerId: string,
    count: number,
  ): Promise<{ count: number }> {
    const sticker = await stickerRepository.getStickerById(stickerId);
    if (!sticker) throw new StickerNotFoundError();
    return stickerRepository.upsertUserStickerCount(userId, stickerId, count);
  },
};
