import { describe, expect, it } from 'vitest';

import { normalizeUruguayanMobile } from '../phone';

describe('normalizeUruguayanMobile', () => {
  it.each([
    ['099 123 456', '+59899123456'],
    ['099123456', '+59899123456'],
    ['99 123 456', '+59899123456'],
    ['99123456', '+59899123456'],
    ['098-123-456', '+59898123456'],
    ['091.234.567', '+59891234567'],
    ['(099) 123 456', '+59899123456'],
    ['+598 99 123 456', '+59899123456'],
    ['+59899123456', '+59899123456'],
    ['+598099123456', '+59899123456'],
    ['59899123456', '+59899123456'],
    ['598099123456', '+59899123456'],
    ['0059899123456', '+59899123456'],
  ])('normaliza %s → %s', (input, expected) => {
    expect(normalizeUruguayanMobile(input)).toBe(expected);
  });

  it.each([
    [''],
    ['hola'],
    ['123'],
    ['24001234'], // fijo de Montevideo, no celular
    ['099 12 34'], // muy corto
    ['0991234567890'], // muy largo
    ['+1 555 123 4567'], // otro país
    ['099abc456'],
  ])('rechaza %s', (input) => {
    expect(normalizeUruguayanMobile(input)).toBeNull();
  });

  it('es idempotente sobre el formato canónico', () => {
    const canonical = normalizeUruguayanMobile('099 123 456')!;
    expect(normalizeUruguayanMobile(canonical)).toBe(canonical);
  });
});
