import { createId } from '@paralleldrive/cuid2';

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

  async getExistingStickerIds(ids: string[]): Promise<Set<string>> {
    const rows = await prisma.sticker.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  },

  // Upsert masivo en UNA query (RF-213). `id` lo genera la app (no hay default a
  // nivel DB): filas nuevas usan cuid2 (24 chars), las viejas son cuid v1 (25 chars,
  // de `@default(cuid())`); ambos son PKs opacas, nunca expuestas. Query parametrizada
  // (tagged template, nunca *Unsafe): los arrays van como params text[]/int[].
  async bulkUpsertCounts(
    userId: string,
    changes: { stickerId: string; count: number }[],
  ): Promise<void> {
    const ids = changes.map(() => createId());
    const stickerIds = changes.map((c) => c.stickerId);
    const counts = changes.map((c) => c.count);

    await prisma.$executeRaw`
      INSERT INTO "UserSticker" ("id", "userId", "stickerId", "count", "updatedAt")
      SELECT x.id, ${userId}, x.sid, x.cnt, now()
      FROM unnest(${ids}::text[], ${stickerIds}::text[], ${counts}::int[]) AS x(id, sid, cnt)
      ON CONFLICT ("userId", "stickerId")
      DO UPDATE SET "count" = EXCLUDED."count", "updatedAt" = now()
    `;
  },
};
