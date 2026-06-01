import { userService } from '@/services/user.service';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/matches';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`);
  }

  // RF-103: auto-register on first login
  await userService.getOrCreate({
    email: data.user.email,
    name: data.user.user_metadata?.full_name as string | undefined,
    avatarUrl: data.user.user_metadata?.avatar_url as string | undefined,
  });

  return NextResponse.redirect(`${origin}${next}`);
}
