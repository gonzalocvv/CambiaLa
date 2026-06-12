import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  BANNER_ALLOWED_MIME,
  BANNER_MAX_BYTES,
  type BannerMime,
} from '@/lib/validations/activity.schema';

export const ACTIVITY_BANNER_BUCKET = 'activity-banners';

const EXT_BY_MIME: Record<BannerMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Error de validación del banner (MIME/size). Lo distingue el caller para devolver 400
// (a diferencia de un fallo de storage, que es best-effort y no rompe la creación).
export class BannerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BannerValidationError';
  }
}

function isAllowedMime(mime: string): mime is BannerMime {
  return (BANNER_ALLOWED_MIME as readonly string[]).includes(mime);
}

// Valida MIME/size ANTES de subir y sube a Supabase Storage (bucket público de lectura).
// Devuelve la URL pública, o `null` si la subida falla (ej. bucket inexistente): el banner
// es opcional, así que un fallo de infra se loguea y la actividad se crea sin banner.
// Lanza BannerValidationError si el archivo no pasa las validaciones (eso sí es 400).
export async function uploadActivityBanner(file: File): Promise<string | null> {
  if (!isAllowedMime(file.type)) {
    throw new BannerValidationError('banner_invalid_type');
  }
  if (file.size > BANNER_MAX_BYTES) {
    throw new BannerValidationError('banner_too_large');
  }

  const ext = EXT_BY_MIME[file.type];
  const key = `activities/${crypto.randomUUID()}.${ext}`;

  try {
    const admin = createAdminClient();
    const bytes = await file.arrayBuffer();
    const { error } = await admin.storage
      .from(ACTIVITY_BANNER_BUCKET)
      .upload(key, bytes, { contentType: file.type, upsert: true });
    if (error) throw error;
    const { data } = admin.storage.from(ACTIVITY_BANNER_BUCKET).getPublicUrl(key);
    return data.publicUrl;
  } catch (error) {
    logger.error('activity banner upload failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
