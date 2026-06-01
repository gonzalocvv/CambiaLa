import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { userService } from '@/services/user.service';
import { CheckUsernameQuerySchema } from '@/lib/validations/onboarding.schema';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = CheckUsernameQuerySchema.safeParse({ username: searchParams.get('username') });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const available = await userService.checkUsernameAvailability(parsed.data.username);
  return NextResponse.json({ available });
}
