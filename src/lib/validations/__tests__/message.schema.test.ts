import { describe, expect, it } from 'vitest';

import { SendMessageSchema } from '../message.schema';

describe('SendMessageSchema', () => {
  it('accepts a normal message', () => {
    expect(
      SendMessageSchema.safeParse({ body: 'Hola, ¿seguís teniendo la de Uruguay?' }).success,
    ).toBe(true);
  });

  it('accepts a single character (min)', () => {
    expect(SendMessageSchema.safeParse({ body: 'x' }).success).toBe(true);
  });

  it('accepts exactly 1000 characters (max)', () => {
    expect(SendMessageSchema.safeParse({ body: 'a'.repeat(1000) }).success).toBe(true);
  });

  it('rejects an empty body', () => {
    expect(SendMessageSchema.safeParse({ body: '' }).success).toBe(false);
  });

  it('rejects a body longer than 1000 characters', () => {
    expect(SendMessageSchema.safeParse({ body: 'a'.repeat(1001) }).success).toBe(false);
  });

  it('rejects non-string body', () => {
    expect(SendMessageSchema.safeParse({ body: 123 }).success).toBe(false);
  });

  it('rejects missing body', () => {
    expect(SendMessageSchema.safeParse({}).success).toBe(false);
  });

  it('rejects null body', () => {
    expect(SendMessageSchema.safeParse({ body: null }).success).toBe(false);
  });
});
