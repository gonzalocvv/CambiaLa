import { describe, expect, it } from 'vitest';

import { VerifyOtpSchema } from '../auth.schema';

describe('VerifyOtpSchema', () => {
  const valid = { email: 'gonza@example.com', token: '123456' };

  it('acepta email y token válidos', () => {
    const result = VerifyOtpSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('gonza@example.com');
      expect(result.data.token).toBe('123456');
    }
  });

  it('normaliza el email: trim y lowercase', () => {
    const result = VerifyOtpSchema.safeParse({ email: '  Gonza@Example.COM  ', token: '123456' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('gonza@example.com');
    }
  });

  it('normaliza el token: elimina espacios', () => {
    const result = VerifyOtpSchema.safeParse({ email: valid.email, token: '12 34 56' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe('123456');
    }
  });

  it('rechaza email sin @', () => {
    const result = VerifyOtpSchema.safeParse({ email: 'noesunemail', token: valid.token });
    expect(result.success).toBe(false);
  });

  it('rechaza email vacío', () => {
    const result = VerifyOtpSchema.safeParse({ email: '', token: valid.token });
    expect(result.success).toBe(false);
  });

  it('rechaza email ausente', () => {
    const result = VerifyOtpSchema.safeParse({ token: valid.token });
    expect(result.success).toBe(false);
  });

  it('rechaza token con menos de 6 dígitos', () => {
    const result = VerifyOtpSchema.safeParse({ email: valid.email, token: '12345' });
    expect(result.success).toBe(false);
  });

  it('rechaza token con más de 6 dígitos', () => {
    const result = VerifyOtpSchema.safeParse({ email: valid.email, token: '1234567' });
    expect(result.success).toBe(false);
  });

  it('rechaza token con caracteres no numéricos', () => {
    const result = VerifyOtpSchema.safeParse({ email: valid.email, token: 'abc123' });
    expect(result.success).toBe(false);
  });

  it('rechaza token ausente', () => {
    const result = VerifyOtpSchema.safeParse({ email: valid.email });
    expect(result.success).toBe(false);
  });

  it('rechaza token no-string', () => {
    const result = VerifyOtpSchema.safeParse({ email: valid.email, token: 123456 });
    expect(result.success).toBe(false);
  });
});
