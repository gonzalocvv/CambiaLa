/**
 * Normaliza un celular uruguayo a formato E.164: +5989XXXXXXX
 *
 * Acepta lo que la gente escribe de verdad:
 *   "099 123 456"      → +59899123456
 *   "099123456"        → +59899123456
 *   "99 123 456"       → +59899123456
 *   "+598 99 123 456"  → +59899123456
 *   "+598099123456"    → +59899123456  (con el 0 de más)
 *   "0059899123456"    → +59899123456  (prefijo internacional 00)
 *   "098-123-456"      → +59898123456
 *
 * Devuelve null si no se puede interpretar como celular uruguayo
 * (los celulares son 09X XXX XXX → 8 dígitos empezando en 9 sin el 0).
 */
export function normalizeUruguayanMobile(input: string): string | null {
  let digits = input.replace(/[\s.\-()]/g, '');

  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith('00598')) digits = digits.slice(5);
  else if (digits.startsWith('598') && digits.length > 9) digits = digits.slice(3);

  // Sacar el 0 inicial del formato local (099 → 99)
  if (digits.startsWith('0')) digits = digits.slice(1);

  // Celular uruguayo sin el 0: 9XXXXXXX (8 dígitos, empieza en 9)
  return /^9\d{7}$/.test(digits) ? `+598${digits}` : null;
}
