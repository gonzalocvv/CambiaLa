import { NextResponse } from 'next/server';

import { extractActivityForm } from '@/lib/activities/form';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { BannerValidationError } from '@/lib/storage/activity-banner';
import {
  CreateActivitySchema,
  ListActivitiesQuerySchema,
} from '@/lib/validations/activity.schema';
import { activityService, NoActiveAlbumError } from '@/services/activity.service';

// GET /api/admin/activities — lista admin (todas, publicadas o no).
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const parsed = ListActivitiesQuerySchema.safeParse({
    department: searchParams.get('department') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_params' }, { status: 400 });

  const result = await activityService.listForAdmin(parsed.data);
  return NextResponse.json(result);
}

// POST /api/admin/activities — crea una actividad (multipart/form-data con banner opcional).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

  const { fields, bannerFile } = extractActivityForm(form);
  const parsed = CreateActivitySchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const created = await activityService.createActivity(parsed.data, session.userId, bannerFile);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof BannerValidationError)
      return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof NoActiveAlbumError)
      return NextResponse.json({ error: 'no_active_album' }, { status: 409 });
    logger.error('create activity failed', { error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
