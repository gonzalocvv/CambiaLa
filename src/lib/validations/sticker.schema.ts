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

export const UpdateStickerCountSchema = z.object({
  count: z.number().int().min(0).max(99),
});

export type StickerRarity = z.infer<typeof StickerRaritySchema>;
export type StickerWithCount = z.infer<typeof StickerWithCountSchema>;
export type AlbumStats = z.infer<typeof AlbumStatsSchema>;
export type GetAlbumResponse = z.infer<typeof GetAlbumResponseSchema>;
export type UpdateStickerCountInput = z.infer<typeof UpdateStickerCountSchema>;
