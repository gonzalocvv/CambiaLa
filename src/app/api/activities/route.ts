import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { ListActivitiesQuerySchema } from '@/lib/validations/activity.schema';
import { activityService } from '@/services/activity.service';
import { userService } from '@/services/user.service';

// GET /api/activities — lista visible para usuarios logueados. Default: depto del usuario;
// ?department= para cambiar. 401 sin sesión.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = ListActivitiesQuerySchema.safeParse({
    department: searchParams.get('department') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_params' }, { status: 400 });

  const profile = await userService.getUserProfile(session.userId);
  const result = await activityService.listForDepartment(profile.city ?? null, parsed.data);
  return NextResponse.json(result);
}
