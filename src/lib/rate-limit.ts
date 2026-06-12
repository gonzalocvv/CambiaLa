// Ventana fija en memoria (ADR-016). Por instancia serverless → migrar a Redis en F2.
interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

const store = new Map<string, RateLimitEntry>();
let callsSinceCleanup = 0;
const CLEANUP_EVERY = 200;

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  if (++callsSinceCleanup >= CLEANUP_EVERY) {
    callsSinceCleanup = 0;
    cleanup();
  }

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count += 1;
  return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count) };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export function _resetStoreForTests(): void {
  store.clear();
  callsSinceCleanup = 0;
}
