import { PrismaClient } from '@prisma/client';

import { logger } from '../src/lib/logger';
import catalogData from './data/mundial-2026.json';

const prisma = new PrismaClient();

const BATCH_SIZE = 100;

async function main(): Promise<void> {
  logger.info('Iniciando seed del catálogo...', { album: catalogData.album.slug });

  const album = await prisma.album.upsert({
    where: { slug: catalogData.album.slug },
    update: {
      name: catalogData.album.name,
      totalStickers: catalogData.album.totalStickers,
      releasedAt: new Date(catalogData.album.releasedAt),
    },
    create: {
      slug: catalogData.album.slug,
      name: catalogData.album.name,
      totalStickers: catalogData.album.totalStickers,
      releasedAt: new Date(catalogData.album.releasedAt),
      isActive: true,
    },
  });

  logger.info('Álbum upsertado', { id: album.id, slug: album.slug });

  const { stickers } = catalogData;

  for (let i = 0; i < stickers.length; i += BATCH_SIZE) {
    const batch = stickers.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((s) =>
        prisma.sticker.upsert({
          where: { albumId_number: { albumId: album.id, number: s.number } },
          update: {
            name: s.name ?? null,
            team: s.team,
            rarity: s.rarity,
            isSpecial: s.isSpecial,
          },
          create: {
            albumId: album.id,
            number: s.number,
            name: s.name ?? null,
            team: s.team,
            rarity: s.rarity,
            isSpecial: s.isSpecial,
          },
        }),
      ),
    );

    logger.info(
      `Figuritas procesadas: ${Math.min(i + BATCH_SIZE, stickers.length)}/${stickers.length}`,
    );
  }

  logger.info('Seed completado', {
    album: album.name,
    totalStickers: stickers.length,
  });
}

main()
  .catch((e: unknown) => {
    logger.error('Error en seed', { error: String(e) });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
