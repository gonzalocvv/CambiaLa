import type { User } from '@supabase/supabase-js';

import { userService } from '@/services/user.service';

/**
 * Registra (o recupera) al usuario en nuestra DB tras un login exitoso y
 * devuelve a dónde mandarlo. Compartido por TODOS los métodos de auth:
 *   - magic link / token-hash  (GET /api/auth/callback)
 *   - Google OAuth (PKCE code) (GET /api/auth/callback)
 *   - código OTP de 6 dígitos  (POST /api/auth/verify-otp)
 *
 * RF-103: alta automática en el primer login.
 * RF-108: si todavía no completó el onboarding, va a /onboarding.
 */
export async function resolveDestinationForUser(user: User, next = '/matches'): Promise<string> {
  const dbUser = await userService.getOrCreate({
    email: user.email!,
    name: user.user_metadata?.full_name as string | undefined,
    avatarUrl: user.user_metadata?.avatar_url as string | undefined,
  });

  return dbUser.onboardingDoneAt ? next : '/onboarding';
}
