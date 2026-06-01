import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { notificationService } from '@/services/notification.service';

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const notification = await notificationService.markNotificationRead(id, session.userId);
  if (!notification) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
