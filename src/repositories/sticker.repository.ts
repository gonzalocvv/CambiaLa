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
    if (changes.length === 0) return; // N6: contrato robusto aunque el caller no filtre

    // L8: orden determinístico por stickerId → todos los statements concurrentes toman los
    // locks de fila en el mismo orden, evitando deadlocks (40P01) entre flushes solapados.
    const ordered = [...changes].sort((a, b) => a.stickerId.localeCompare(b.stickerId));
    const ids = ordered.map(() => createId());
    const stickerIds = ordered.map((c) => c.stickerId);
    const counts = ordered.map((c) => c.count);

    // N7: updatedAt se setea a mano con now() porque @updatedAt de Prisma NO corre en raw SQL
    // y la columna es NOT NULL sin default a nivel DB. No es redundante: no lo borres.
    await prisma.$executeRaw`
      INSERT INTO "UserSticker" ("id", "userId", "stickerId", "count", "updatedAt")
      SELECT x.id, ${userId}, x.sid, x.cnt, now()
      FROM unnest(${ids}::text[], ${stickerIds}::text[], ${counts}::int[]) AS x(id, sid, cnt)
      ON CONFLICT ("userId", "stickerId")
      DO UPDATE SET "count" = EXCLUDED."count", "updatedAt" = now()
    `;
  },
};
