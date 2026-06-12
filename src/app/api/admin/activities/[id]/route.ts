import { NextResponse } from 'next/server';

import { extractActivityForm } from '@/lib/activities/form';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { BannerValidationError } from '@/lib/storage/activity-banner';
import { UpdateActivitySchema } from '@/lib/validations/activity.schema';
import { ActivityNotFoundError, activityService } from '@/services/activity.service';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/activities/[id] — edita una actividad (multipart, banner opcional).
export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

  const { fields, bannerFile } = extractActivityForm(form);
  const parsed = UpdateActivitySchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  try {
    const updated = await activityService.updateActivity(id, parsed.data, bannerFile);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ActivityNotFoundError)
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (e instanceof BannerValidationError)
      return NextResponse.json({ error: e.message }, { status: 400 });
    logger.error('update activity failed', { error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

// DELETE /api/admin/activities/[id] — borra una actividad.
export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  try {
    await activityService.deleteActivity(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ActivityNotFoundError)
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    logger.error('delete activity failed', { error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
