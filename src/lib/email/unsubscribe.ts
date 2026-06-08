// RF-408: tokens de baja firmados (HMAC). El userId NO es secreto (es un CUID), pero
// la baja requiere la firma → nadie puede forjar/enumerar un link de unsubscribe sin el
// secret. Secret leído en cada llamada (no a nivel módulo) para que el build sin
// UNSUBSCRIBE_SECRET no rompa y para que los tests puedan setearlo.
//
// RF-345: se agrega expiración al token (30 días) y soporte de token de reactivación
// (resubscribe) que embebe la frecuencia previa para restaurarla en un click.
import { createHmac, timingSafeEqual } from 'node:crypto';

// SHA-256 hex = 64 chars.
const SIG_HEX_RE = /^[0-9a-f]{64}$/;

const DEFAULT_UNSUB_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 días
const DEFAULT_RESUB_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

function getSecret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET || null;
}

function hmacHex(secret: string, context: string, payload: string): string {
  return createHmac('sha256', secret).update(`${context}:${payload}`).digest('hex');
}

function timingSafeVerify(
  secret: string,
  context: string,
  payload: string,
  sigHex: string,
): boolean {
  if (!SIG_HEX_RE.test(sigHex)) return false;
  const expected = createHmac('sha256', secret).update(`${context}:${payload}`).digest();
  const provided = Buffer.from(sigHex, 'hex');
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

// ─── Unsubscribe token ───────────────────────────────────────────────────────
// Format: ${userId}.${expSeconds}.${sig}
// sig covers context="unsub" + payload=userId.expSeconds

export function signUnsubscribeToken(
  userId: string,
  ttlSeconds = DEFAULT_UNSUB_TTL_SECONDS,
): string {
  const secret = getSecret();
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set');
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${exp}`;
  const sig = hmacHex(secret, 'unsub', payload);
  return `${payload}.${sig}`;
}

// Returns userId on success, null on any failure (invalid, expired, tampered).
export function verifyUnsubscribeToken(token: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  // Expects exactly 3 parts: userId, expStr, sigHex
  if (parts.length !== 3) return null;

  const [userId, expStr, sigHex] = parts;
  if (!userId || !expStr || !/^\d+$/.test(expStr)) return null;

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Math.floor(Date.now() / 1000) > exp) return null;

  const payload = `${userId}.${expStr}`;
  if (!timingSafeVerify(secret, 'unsub', payload, sigHex)) return null;

  return userId;
}

// ─── Resubscribe token ───────────────────────────────────────────────────────
// Format: ${userId}.${prevFreq}.${expSeconds}.${sig}
// sig covers context="resub" + payload=userId.prevFreq.expSeconds

export function signResubscribeToken(
  userId: string,
  prevFreq: string,
  ttlSeconds = DEFAULT_RESUB_TTL_SECONDS,
): string {
  const secret = getSecret();
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set');
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${prevFreq}.${exp}`;
  const sig = hmacHex(secret, 'resub', payload);
  return `${payload}.${sig}`;
}

// Returns {userId, prevFreq} on success, null on any failure.
export function verifyResubscribeToken(token: string): { userId: string; prevFreq: string } | null {
  const secret = getSecret();
  if (!secret) return null;
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  // Expects exactly 4 parts: userId, prevFreq, expStr, sigHex
  if (parts.length !== 4) return null;

  const [userId, prevFreq, expStr, sigHex] = parts;
  if (!userId || !prevFreq || !expStr || !/^\d+$/.test(expStr)) return null;

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Math.floor(Date.now() / 1000) > exp) return null;

  const payload = `${userId}.${prevFreq}.${expStr}`;
  if (!timingSafeVerify(secret, 'resub', payload, sigHex)) return null;

  return { userId, prevFreq };
}
