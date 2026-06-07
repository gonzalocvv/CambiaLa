import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { SuspendUserSchema } from '@/lib/validations/admin.schema';
import { userService, UserNotFoundError } from '@/services/user.service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  try {
    const user = await userService.getUserDetailForAdmin(id);
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UserNotFoundError)
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    throw e;
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = SuspendUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const { id } = await ctx.params;
  try {
    const updated = await userService.toggleSuspension(id, parsed.data.isSuspended);
    return NextResponse.json({ ok: true, isSuspended: updated.isSuspended });
  } catch (e) {
    if (e instanceof UserNotFoundError)
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    throw e;
  }
}
