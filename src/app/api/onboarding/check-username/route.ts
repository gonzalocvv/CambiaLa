import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { userService } from '@/services/user.service';
import { CheckUsernameQuerySchema } from '@/lib/validations/onboarding.schema';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Anti-enumeración: 20 búsquedas por minuto por usuario
  const rl = checkRateLimit(`chkusr:${session.userId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = CheckUsernameQuerySchema.safeParse({ username: searchParams.get('username') });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const available = await userService.checkUsernameAvailability(parsed.data.username);
  return NextResponse.json({ available });
}
