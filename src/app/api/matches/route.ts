import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { matchService } from '@/services/match.service';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matches = await matchService.getActiveMatchesWithPartners(session.userId);
  return NextResponse.json({ matches });
}
