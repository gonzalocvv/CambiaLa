import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { signUnsubscribeToken, verifyUnsubscribeToken } from '../unsubscribe';

const ORIGINAL = process.env.UNSUBSCRIBE_SECRET;

beforeEach(() => {
  process.env.UNSUBSCRIBE_SECRET = 'test-secret-abc';
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.UNSUBSCRIBE_SECRET;
  else process.env.UNSUBSCRIBE_SECRET = ORIGINAL;
});

describe('unsubscribe token', () => {
  it('signs and verifies a round-trip', () => {
    const token = signUnsubscribeToken('user-abc');
    expect(token.startsWith('user-abc.')).toBe(true);
    expect(verifyUnsubscribeToken(token)).toBe('user-abc');
  });

  it('rejects a tampered userId (signature no longer matches)', () => {
    const token = signUnsubscribeToken('user-abc');
    const tampered = token.replace('user-abc', 'user-xyz');
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signUnsubscribeToken('user-abc');
    process.env.UNSUBSCRIBE_SECRET = 'a-different-secret';
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it('returns null for malformed tokens', () => {
    expect(verifyUnsubscribeToken('')).toBeNull();
    expect(verifyUnsubscribeToken('no-dot')).toBeNull();
    expect(verifyUnsubscribeToken('user-abc.')).toBeNull();
    expect(verifyUnsubscribeToken('.deadbeef')).toBeNull();
    expect(verifyUnsubscribeToken('user-abc.not-hex-signature')).toBeNull();
  });

  it('returns null for a signature of the wrong length (no RangeError)', () => {
    expect(verifyUnsubscribeToken('user-abc.abcd')).toBeNull();
  });

  it('signing throws and verifying returns null when the secret is missing', () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    expect(() => signUnsubscribeToken('user-abc')).toThrow();
    expect(verifyUnsubscribeToken('user-abc.deadbeef')).toBeNull();
  });
});
