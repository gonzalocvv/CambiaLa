import { NextResponse } from 'next/server';
import type { EmailOtpType, User } from '@supabase/supabase-js';

import { userService } from '@/services/user.service';
import { createClient } from '@/lib/supabase/server';

// Handles the magic-link / OTP callback. Supports BOTH:
//   1. PKCE flow  (?code=...)             — same-device, exchangeCodeForSession
//   2. Token-hash flow (?token_hash=&type=) — cross-device, verifyOtp
// The token-hash flow is what the (recommended) server-side email template
// produces and works even if the link is opened on a different device than the
// one that requested it. See HANDOFF "RF-101b" for the required dashboard config.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/matches';

  const supabase = await createClient();

  let user: User | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`);
    }
    user = data.user;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/auth/login?error=verify_failed`);
    }
    user = data.user;
  } else {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  if (!user.email) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_email`);
  }

  // RF-103: auto-register on first login
  const dbUser = await userService.getOrCreate({
    email: user.email,
    name: user.user_metadata?.full_name as string | undefined,
    avatarUrl: user.user_metadata?.avatar_url as string | undefined,
  });

  // RF-108: redirect to onboarding if not completed yet
  const destination = dbUser.onboardingDoneAt ? next : '/onboarding';
  return NextResponse.redirect(`${origin}${destination}`);
}
