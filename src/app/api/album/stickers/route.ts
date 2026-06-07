import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { BulkUpdateStickersSchema } from '@/lib/validations/sticker.schema';
import { stickerService } from '@/services/sticker.service';

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
