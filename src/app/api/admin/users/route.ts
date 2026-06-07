import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { ListUsersQuerySchema } from '@/lib/validations/admin.schema';
import { userService } from '@/services/user.service';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const parsed = ListUsersQuerySchema.safeParse({
    search: searchParams.get('search') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_params' }, { status: 400 });

  const result = await userService.listUsersForAdmin(parsed.data);
  return NextResponse.json(result);
}
