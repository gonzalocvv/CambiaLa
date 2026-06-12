import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { UpdateProfileSchema } from '@/lib/validations/settings.schema';
import { userService, UserNotFoundError } from '@/services/user.service';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await userService.getUserProfile(session.userId);
  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await userService.updateProfile(session.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
