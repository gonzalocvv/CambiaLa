import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente service-role para operaciones privilegiadas server-side (Storage, auth.admin…).
// NUNCA debe usarse en el cliente: la SUPABASE_SERVICE_ROLE_KEY no se expone al browser.
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
