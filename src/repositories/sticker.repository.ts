import { prisma } from '@/lib/prisma';

import type { StickerRarity, StickerWithCount } from '@/lib/validations/sticker.schema';

const MUNDIAL_2026_SLUG = 'mundial-2026';

export const stickerRepository = {
  async getAlbumWithUserCounts(
    userId: string,
  ): Promise<{ albumId: string; stickers: StickerWithCount[] } | null> {
    const album = await prisma.album.findUnique({
      where: { slug: MUNDIAL_2026_SLUG },
      include: {
        stickers: {
          include: {
            userStickers: {
              where: { userId },
              select: { count: true },
            },
          },
          orderBy: [{ team: 'asc' }, { number: 'asc' }],
        },
      },
    });

    if (!album) return null;

    const stickers: StickerWithCount[] = album.stickers.map((s) => ({
      id: s.id,
      number: s.number,
      name: s.name,
      team: s.team,
      rarity: s.rarity as StickerRarity,
      isSpecial: s.isSpecial,
      count: s.userStickers[0]?.count ?? 0,
    }));

    return { albumId: album.id, stickers };
  },

  async upsertUserStickerCount(
    userId: string,
    stickerId: string,
    count: number,
  ): Promise<{ count: number }> {
    return prisma.userSticker.upsert({
      where: { userId_stickerId: { userId, stickerId } },
      update: { count },
      create: { userId, stickerId, count },
      select: { count: true },
    });
  },

  async getStickerById(stickerId: string): Promise<{ id: string; albumId: string } | null> {
    return prisma.sticker.findUnique({
      where: { id: stickerId },
      select: { id: true, albumId: true },
    });
  },
};
