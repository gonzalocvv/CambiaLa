import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  signResubscribeToken,
  signUnsubscribeToken,
  verifyResubscribeToken,
  verifyUnsubscribeToken,
} from '../unsubscribe';

const ORIGINAL = process.env.UNSUBSCRIBE_SECRET;

beforeEach(() => {
  process.env.UNSUBSCRIBE_SECRET = 'test-secret-abc';
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.UNSUBSCRIBE_SECRET;
  else process.env.UNSUBSCRIBE_SECRET = ORIGINAL;
  vi.useRealTimers();
});

describe('signUnsubscribeToken / verifyUnsubscribeToken', () => {
  it('signs and verifies a round-trip', () => {
    const token = signUnsubscribeToken('user-abc');
    expect(verifyUnsubscribeToken(token)).toBe('user-abc');
  });

  it('token includes the expiry (3 dot-separated parts: userId.expStr.sig)', () => {
    const token = signUnsubscribeToken('user-abc');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('user-abc');
    expect(/^\d+$/.test(parts[1])).toBe(true); // expStr is digits
  });

  it('rejects a token once it has expired', () => {
    const token = signUnsubscribeToken('user-abc', 60); // 60s TTL
    vi.advanceTimersByTime(61_000); // 61 seconds later
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it('accepts a token just before expiry', () => {
    const token = signUnsubscribeToken('user-abc', 60);
    vi.advanceTimersByTime(59_000);
    expect(verifyUnsubscribeToken(token)).toBe('user-abc');
  });

  it('rejects a tampered userId', () => {
    const token = signUnsubscribeToken('user-abc');
    const parts = token.split('.');
    const tampered = `user-xyz.${parts[1]}.${parts[2]}`;
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it('rejects a tampered expiry', () => {
    const token = signUnsubscribeToken('user-abc', 60);
    const parts = token.split('.');
    const bigExp = String(parseInt(parts[1], 10) + 9999999);
    const tampered = `${parts[0]}.${bigExp}.${parts[2]}`;
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
    // Old format (userId.sig, only 2 parts) is rejected
    expect(
      verifyUnsubscribeToken(
        'user-abc.deadbeef12345678deadbeef12345678deadbeef12345678deadbeef12345678',
      ),
    ).toBeNull();
  });

  it('signing throws and verifying returns null when the secret is missing', () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    expect(() => signUnsubscribeToken('user-abc')).toThrow('UNSUBSCRIBE_SECRET is not set');
    expect(verifyUnsubscribeToken('user-abc.12345.deadbeef')).toBeNull();
  });

  it('a resubscribe token is rejected by verifyUnsubscribeToken (different context)', () => {
    const resub = signResubscribeToken('user-abc', 'daily');
    expect(verifyUnsubscribeToken(resub)).toBeNull();
  });
});

describe('signResubscribeToken / verifyResubscribeToken', () => {
  it('signs and verifies a round-trip with the previous frequency', () => {
    const token = signResubscribeToken('user-abc', 'daily');
    const result = verifyResubscribeToken(token);
    expect(result).toEqual({ userId: 'user-abc', prevFreq: 'daily' });
  });

  it('token has 4 dot-separated parts: userId.prevFreq.expStr.sig', () => {
    const token = signResubscribeToken('user-abc', 'weekly');
    const parts = token.split('.');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('user-abc');
    expect(parts[1]).toBe('weekly');
    expect(/^\d+$/.test(parts[2])).toBe(true);
  });

  it('rejects an expired resubscribe token', () => {
    const token = signResubscribeToken('user-abc', 'instant', 60);
    vi.advanceTimersByTime(61_000);
    expect(verifyResubscribeToken(token)).toBeNull();
  });

  it('rejects a tampered prevFreq', () => {
    const token = signResubscribeToken('user-abc', 'daily');
    const parts = token.split('.');
    const tampered = `${parts[0]}.instant.${parts[2]}.${parts[3]}`;
    expect(verifyResubscribeToken(tampered)).toBeNull();
  });

  it('rejects a tampered userId', () => {
    const token = signResubscribeToken('user-abc', 'daily');
    const parts = token.split('.');
    const tampered = `user-xyz.${parts[1]}.${parts[2]}.${parts[3]}`;
    expect(verifyResubscribeToken(tampered)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signResubscribeToken('user-abc', 'weekly');
    process.env.UNSUBSCRIBE_SECRET = 'other-secret';
    expect(verifyResubscribeToken(token)).toBeNull();
  });

  it('returns null for malformed tokens', () => {
    expect(verifyResubscribeToken('')).toBeNull();
    expect(verifyResubscribeToken('no-dot')).toBeNull();
    expect(verifyResubscribeToken('a.b.c')).toBeNull(); // only 3 parts
  });

  it('signing throws and verifying returns null when the secret is missing', () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    expect(() => signResubscribeToken('user-abc', 'daily')).toThrow(
      'UNSUBSCRIBE_SECRET is not set',
    );
    expect(verifyResubscribeToken('a.b.c.deadbeef')).toBeNull();
  });

  it('an unsubscribe token is rejected by verifyResubscribeToken (different context)', () => {
    const unsub = signUnsubscribeToken('user-abc');
    expect(verifyResubscribeToken(unsub)).toBeNull();
  });
});
