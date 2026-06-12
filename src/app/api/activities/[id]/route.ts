import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { activityService } from '@/services/activity.service';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/activities/[id] — detalle de una actividad (usuario logueado).
export async function GET(_request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const activity = await activityService.getActivityDetail(id);
  if (!activity) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(activity);
}
