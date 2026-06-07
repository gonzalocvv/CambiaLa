import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { userService, UserNotFoundError } from '@/services/user.service';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get Supabase auth user ID before deleting the DB record
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  try {
    await userService.deleteAccount(session.userId);
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  // Sign out current Supabase session
  await supabase.auth.signOut();

  // Best-effort: delete auth user from Supabase (requires service role)
  if (authUser?.id) {
    try {
      const admin = createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      await admin.auth.admin.deleteUser(authUser.id);
    } catch {
      // Non-blocking — DB data is already deleted, auth cleanup is best-effort
    }
  }

  return NextResponse.json({ ok: true });
}
