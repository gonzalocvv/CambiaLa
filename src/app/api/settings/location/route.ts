import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UpdateLocationSchema } from '@/lib/validations/settings.schema';
import { userService, UserNotFoundError } from '@/services/user.service';

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await userService.updateLocation(session.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    throw err;
  }
}
