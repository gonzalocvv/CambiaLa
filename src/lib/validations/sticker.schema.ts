import { z } from 'zod';

export const StickerRaritySchema = z.enum(['comun', 'dificil', 'muy_dificil', 'especial']);

export const StickerWithCountSchema = z.object({
  id: z.string(),
  number: z.string(),
  name: z.string().nullable(),
  team: z.string(),
  rarity: StickerRaritySchema,
  isSpecial: z.boolean(),
  count: z.number().int().min(0).max(99),
});

export const AlbumStatsSchema = z.object({
  total: z.number().int(),
  have: z.number().int(),
  missing: z.number().int(),
  duplicates: z.number().int(),
  percentComplete: z.number().min(0).max(100),
});

export const GetAlbumResponseSchema = z.object({
  albumId: z.string(),
  stickers: z.array(StickerWithCountSchema),
  stats: AlbumStatsSchema,
});

// Bulk: una ráfaga de clicks en el álbum se manda en un solo PATCH (RF-213).
export const BulkUpdateStickersSchema = z.object({
  changes: z
    .array(
      z.object({
        stickerId: z.string().min(1),
        count: z.number().int().min(0).max(99),
      }),
    )
    .min(1)
    .max(200),
});

export type StickerRarity = z.infer<typeof StickerRaritySchema>;
export type StickerWithCount = z.infer<typeof StickerWithCountSchema>;
export type AlbumStats = z.infer<typeof AlbumStatsSchema>;
export type GetAlbumResponse = z.infer<typeof GetAlbumResponseSchema>;
export type BulkUpdateStickersInput = z.infer<typeof BulkUpdateStickersSchema>;
