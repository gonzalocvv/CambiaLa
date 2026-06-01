import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { userService, UsernameConflictError } from '@/services/user.service';
import { CompleteOnboardingSchema } from '@/lib/validations/onboarding.schema';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CompleteOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await userService.completeOnboarding(session.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UsernameConflictError) {
      return NextResponse.json({ error: 'USERNAME_TAKEN' }, { status: 409 });
    }
    throw err;
  }
}
