import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { GetNotificationsQuerySchema } from '@/lib/validations/notification.schema';
import { notificationService } from '@/services/notification.service';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = GetNotificationsQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { page, limit } = parsed.data;
  const result = await notificationService.getNotificationsForUser(session.userId, page, limit);
  return NextResponse.json(result);
}
