// RF-408: tokens de baja firmados (HMAC). El userId NO es secreto (es un CUID), pero
// la baja requiere la firma → nadie puede forjar/enumerar un link de unsubscribe sin el
// secret. Secret leído en cada llamada (no a nivel módulo) para que el build sin
// UNSUBSCRIBE_SECRET no rompa y para que los tests puedan setearlo.
import { createHmac, timingSafeEqual } from 'node:crypto';

// SHA-256 hex = 64 chars.
const SIG_HEX_RE = /^[0-9a-f]{64}$/;

function getSecret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET || null;
}

// Devuelve `${userId}.${sigHex}`. Lanza si falta el secret (el caller lo atrapa
// y, sin secret, no se manda el mail — fail-safe: nunca un link de baja sin firmar).
export function signUnsubscribeToken(userId: string): string {
  const secret = getSecret();
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set');
  const sig = createHmac('sha256', secret).update(userId).digest('hex');
  return `${userId}.${sig}`;
}

// Verifica el token y devuelve el userId, o null ante cualquier problema
// (sin secret, malformado, firma inválida, longitudes distintas). Comparación
// timing-safe, con guard de longitud (timingSafeEqual tira RangeError si difieren).
export function verifyUnsubscribeToken(token: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  if (typeof token !== 'string') return null;

  const idx = token.lastIndexOf('.');
  if (idx <= 0 || idx === token.length - 1) return null;

  const userId = token.slice(0, idx);
  const sigHex = token.slice(idx + 1);
  if (!SIG_HEX_RE.test(sigHex)) return null;

  const expected = createHmac('sha256', secret).update(userId).digest();
  const provided = Buffer.from(sigHex, 'hex');
  if (provided.length !== expected.length) return null;

  try {
    if (!timingSafeEqual(provided, expected)) return null;
  } catch {
    return null;
  }
  return userId;
}
