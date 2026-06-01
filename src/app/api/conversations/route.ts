import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { messageService } from '@/services/message.service';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conversations = await messageService.getConversationsForUser(session.userId);
  return NextResponse.json({ conversations });
}
