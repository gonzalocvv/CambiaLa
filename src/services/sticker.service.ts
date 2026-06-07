import type { AlbumStats, GetAlbumResponse } from '@/lib/validations/sticker.schema';
import { stickerRepository } from '@/repositories/sticker.repository';

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

  // RF-213: aplica una ráfaga de cambios en un solo write. Deduplica por stickerId
  // (último gana), ignora ids fuera del catálogo (evita romper la FK) y devuelve
  // cuántos se aplicaron vs ignoraron. Único punto de escritura del álbum: RF-320
  // colgará acá el recompute síncrono de matches (guardado por applied > 0).
  async bulkUpdateCounts(
    userId: string,
    changes: { stickerId: string; count: number }[],
  ): Promise<{ applied: number; ignored: number }> {
    const deduped = new Map<string, number>();
    for (const c of changes) deduped.set(c.stickerId, c.count);

    const ids = [...deduped.keys()];
    const existing = await stickerRepository.getExistingStickerIds(ids);

    const valid = ids
      .filter((id) => existing.has(id))
      .map((id) => ({ stickerId: id, count: deduped.get(id)! }));
    const ignored = ids.length - valid.length;

    if (valid.length > 0) {
      await stickerRepository.bulkUpsertCounts(userId, valid);
    }

    return { applied: valid.length, ignored };
  },
};
