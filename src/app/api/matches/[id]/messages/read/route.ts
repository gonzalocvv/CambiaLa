import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { MatchNotFoundError, MessageAccessError, messageService } from '@/services/message.service';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: matchId } = await params;

  try {
    await messageService.markRead(matchId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MatchNotFoundError || err instanceof MessageAccessError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    throw err;
  }
}
