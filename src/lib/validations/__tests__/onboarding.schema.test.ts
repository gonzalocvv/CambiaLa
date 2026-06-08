import { describe, expect, it } from 'vitest';

import { CompleteOnboardingSchema, UsernameSchema } from '../onboarding.schema';

describe('UsernameSchema', () => {
  it('accepts a valid username', () => {
    expect(UsernameSchema.safeParse('juan_ar').success).toBe(true);
  });

  it('accepts alphanumeric with underscore', () => {
    expect(UsernameSchema.safeParse('User_123').success).toBe(true);
  });

  it('accepts exactly 3 characters (min)', () => {
    expect(UsernameSchema.safeParse('abc').success).toBe(true);
  });

  it('accepts exactly 20 characters (max)', () => {
    expect(UsernameSchema.safeParse('abcdefghij1234567890').success).toBe(true);
  });

  it('rejects 2 characters (below min)', () => {
    expect(UsernameSchema.safeParse('ab').success).toBe(false);
  });

  it('rejects 21 characters (above max)', () => {
    expect(UsernameSchema.safeParse('abcdefghij12345678901').success).toBe(false);
  });

  it('rejects hyphen (not allowed)', () => {
    expect(UsernameSchema.safeParse('juan-ar').success).toBe(false);
  });

  it('rejects space', () => {
    expect(UsernameSchema.safeParse('juan ar').success).toBe(false);
  });

  it('rejects accented characters', () => {
    expect(UsernameSchema.safeParse('juán').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(UsernameSchema.safeParse('').success).toBe(false);
  });

  it('rejects non-string type', () => {
    expect(UsernameSchema.safeParse(123).success).toBe(false);
  });
});

describe('CompleteOnboardingSchema', () => {
  it('accepts valid input without neighborhood for non-Montevideo city', () => {
    const result = CompleteOnboardingSchema.safeParse({
      username: 'gonzalo',
      city: 'Canelones',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with neighborhood for Montevideo', () => {
    const result = CompleteOnboardingSchema.safeParse({
      username: 'gonzalo',
      city: 'Montevideo',
      neighborhood: 'Pocitos',
    });
    expect(result.success).toBe(true);
  });

  it('rejects Montevideo without neighborhood', () => {
    const result = CompleteOnboardingSchema.safeParse({
      username: 'gonzalo',
      city: 'Montevideo',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid city', () => {
    const result = CompleteOnboardingSchema.safeParse({
      username: 'gonzalo',
      city: 'Argentina',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid username (too short)', () => {
    const result = CompleteOnboardingSchema.safeParse({
      username: 'ab',
      city: 'Salto',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid username (special chars)', () => {
    const result = CompleteOnboardingSchema.safeParse({
      username: 'bad name!',
      city: 'Salto',
    });
    expect(result.success).toBe(false);
  });
});
