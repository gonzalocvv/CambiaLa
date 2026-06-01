import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UpdateStickerCountSchema } from '@/lib/validations/sticker.schema';
import { StickerNotFoundError, stickerService } from '@/services/sticker.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ stickerId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { stickerId } = await params;

  const body: unknown = await req.json();
  const parsed = UpdateStickerCountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    const result = await stickerService.updateStickerCount(
      session.userId,
      stickerId,
      parsed.data.count,
    );
    return NextResponse.json({ ok: true, count: result.count });
  } catch (err) {
    if (err instanceof StickerNotFoundError) {
      return NextResponse.json({ error: 'Sticker not found' }, { status: 404 });
    }
    throw err;
  }
}
