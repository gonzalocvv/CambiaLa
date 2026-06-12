import { NextResponse } from 'next/server';

import { resolveDestinationForUser } from '@/lib/auth/resolve-destination';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { VerifyOtpSchema } from '@/lib/validations/auth.schema';

// Verifica el código OTP de 6 dígitos que el usuario recibe por mail.
// Es la alternativa al magic link que NO obliga a abrir el link en el mismo
// dispositivo: el código se puede tipear donde sea (ej. lo recibís en el celu
// y lo escribís en la compu). Al verificar, setea la sesión por cookie y
// devuelve el destino para que el cliente navegue.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const parsed = VerifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  const { email: cleanEmail, token: cleanToken } = parsed.data;

  // Anti brute-force: 10 intentos por IP+email cada 15 min
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(`otp:${ip}:${cleanEmail}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: 'email',
  });

  if (error || !data.user?.email) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 401 });
  }

  const destination = await resolveDestinationForUser(data.user);
  return NextResponse.json({ destination });
}
