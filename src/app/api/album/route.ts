import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { stickerService } from '@/services/sticker.service';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const album = await stickerService.getUserAlbum(session.userId);
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  return NextResponse.json(album);
}
