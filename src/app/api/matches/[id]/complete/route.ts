import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { matchService } from '@/services/match.service';

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const match = await matchService.getMatchDetailForUser(id, session.userId);
  if (!match) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (match.status !== 'active') {
    return NextResponse.json({ error: 'Match is not active' }, { status: 409 });
  }

  await matchService.completeMatch(id);
  return NextResponse.json({ ok: true });
}
