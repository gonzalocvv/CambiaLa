// Auth session helper — wraps Supabase SSR session and resolves the Prisma user ID.
// Note: getSession() does one indexed DB lookup per call (email → CUID).
// Tech debt: add supabaseId field to User model in F2 to eliminate the lookup.
import { cache } from 'react';

import { userRepository } from '@/repositories/user.repository';
import { createClient } from '@/lib/supabase/server';

export type Session = {
  userId: string;
  onboardingDoneAt: Date | null;
  role: string;
};

// cache() deduplicates concurrent calls within the same request (React Server Components).
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;

  const dbUser = await userRepository.findByEmail(user.email);
  if (!dbUser) return null;

  return { userId: dbUser.id, onboardingDoneAt: dbUser.onboardingDoneAt, role: dbUser.role };
});
