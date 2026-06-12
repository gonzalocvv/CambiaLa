import { createId } from '@paralleldrive/cuid2';

import { prisma } from '@/lib/prisma';

import type { StickerRarity, StickerWithCount } from '@/lib/validations/sticker.schema';

const MUNDIAL_2026_SLUG = 'mundial-2026';

// Orden de secciones del álbum: Intro (FWC) primero, países en el medio (A-Z),
// Leyendas (LEG) y Coca-Cola (COKE) al final.
const SECTION_RANK: Record<string, number> = { FWC: 0, LEG: 900, COKE: 901 };
const COUNTRY_RANK = 100;

/** Extrae la parte numérica final del número de figurita ("ALG10" → 10, "FWC1" → 1). */
function numericPart(number: string): number {
  const m = number.match(/(\d+)$/);
  return m ? Number.parseInt(m[1], 10) : 0;
}

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

    const stickers: StickerWithCount[] = album.stickers
      .map((s) => ({
        id: s.id,
        number: s.number,
        name: s.name,
        team: s.team,
        rarity: s.rarity as StickerRarity,
        isSpecial: s.isSpecial,
        count: s.userStickers[0]?.count ?? 0,
      }))
      // Orden del álbum: Intro (FWC) primero, países A-Z, y Leyendas/Coca-Cola
      // al final. Dentro de cada sección, por número REAL (no texto): así
      // "ALG2" va antes que "ALG10" (el orderBy de Prisma ordena el string).
      .sort((a, b) => {
        const rankA = SECTION_RANK[a.team] ?? COUNTRY_RANK;
        const rankB = SECTION_RANK[b.team] ?? COUNTRY_RANK;
        if (rankA !== rankB) return rankA - rankB;
        if (a.team !== b.team) return a.team.localeCompare(b.team);
        return numericPart(a.number) - numericPart(b.number);
      });

    return { albumId: album.id, stickers };
  },

  async getExistingStickerIds(ids: string[]): Promise<Set<string>> {
    const rows = await prisma.sticker.findMany({
      where: { id: { in: ids }, album: { slug: MUNDIAL_2026_SLUG } },
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
