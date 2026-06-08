import { describe, expect, it } from 'vitest';

import { CreateRatingSchema } from '../rating.schema';

describe('CreateRatingSchema', () => {
  it('accepts minimum valid rating (1 star, no comment)', () => {
    expect(CreateRatingSchema.safeParse({ stars: 1 }).success).toBe(true);
  });

  it('accepts maximum valid rating (5 stars)', () => {
    expect(CreateRatingSchema.safeParse({ stars: 5 }).success).toBe(true);
  });

  it('accepts rating with a comment', () => {
    const result = CreateRatingSchema.safeParse({ stars: 4, comment: 'Muy buen cambio' });
    expect(result.success).toBe(true);
  });

  it('accepts comment of exactly 200 characters (max)', () => {
    const result = CreateRatingSchema.safeParse({ stars: 3, comment: 'a'.repeat(200) });
    expect(result.success).toBe(true);
  });

  it('rejects 0 stars (below min)', () => {
    expect(CreateRatingSchema.safeParse({ stars: 0 }).success).toBe(false);
  });

  it('rejects 6 stars (above max)', () => {
    expect(CreateRatingSchema.safeParse({ stars: 6 }).success).toBe(false);
  });

  it('rejects non-integer stars', () => {
    expect(CreateRatingSchema.safeParse({ stars: 3.5 }).success).toBe(false);
  });

  it('rejects string stars', () => {
    expect(CreateRatingSchema.safeParse({ stars: '4' }).success).toBe(false);
  });

  it('rejects missing stars', () => {
    expect(CreateRatingSchema.safeParse({}).success).toBe(false);
  });

  it('rejects comment longer than 200 characters', () => {
    const result = CreateRatingSchema.safeParse({ stars: 5, comment: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });
});
