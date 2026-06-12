import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { BulkUpdateStickersSchema } from '@/lib/validations/sticker.schema';
import { stickerService } from '@/services/sticker.service';

// Seguro de runtime (RF-320/RF-406): el guardado del álbum dispara el recompute SÍNCRONO
// de matches y, por cada match nuevo, el envío de email instant (awaited, timeout 4s c/u).
// En un primer llenado con muchos matches eso encadena varios envíos en este mismo request.
// El álbum YA se persistió antes del recompute, así que sin headroom la función podría toparse
// con el límite default de Vercel y devolver un 504 sobre un guardado que SÍ funcionó. Subimos
// el techo como mitigación barata; la cura real es sacar el envío del request (RF-307/Inngest).
export const maxDuration = 30;

// RF-213: guardado del álbum en bulk — una ráfaga de clicks llega en un solo PATCH.
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Anti-abuso: 30 flushes por minuto por usuario
  const rl = checkRateLimit(`album:${session.userId}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = BulkUpdateStickersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { applied, ignored } = await stickerService.bulkUpdateCounts(
    session.userId,
    parsed.data.changes,
  );
  return NextResponse.json({ ok: true, applied, ignored });
}
