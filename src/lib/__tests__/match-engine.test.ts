import { describe, expect, it } from 'vitest';

import { computeMatch, findMatchesForUser, isActiveUser, isSameLocation } from '../match-engine';
import type { UserCollectionInput } from '@/types/match';

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-01T12:00:00Z');

function makeUser(
  overrides: Partial<UserCollectionInput> & { userId: string },
): UserCollectionInput {
  return {
    stickers: [],
    offerUniques: false,
    city: 'Montevideo',
    neighborhood: 'Pocitos',
    lastSeenAt: NOW,
    participatesInMatchmaking: true,
    ...overrides,
  };
}

// ─── computeMatch ────────────────────────────────────────────────────────────

describe('computeMatch', () => {
  it('returns a match when both users can exchange stickers', () => {
    const userA = makeUser({
      userId: 'A',
      stickers: [
        { number: 'URU1', count: 2 }, // A has spare
        { number: 'ARG1', count: 0 }, // A needs
      ],
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [
        { number: 'ARG1', count: 2 }, // B has spare
        { number: 'URU1', count: 0 }, // B needs
      ],
    });

    const result = computeMatch(userA, userB);

    expect(result).not.toBeNull();
    expect(result!.userAId).toBe('A');
    expect(result!.userBId).toBe('B');
    expect(result!.aToB).toEqual(['URU1']);
    expect(result!.bToA).toEqual(['ARG1']);
    expect(result!.score).toBe(1);
  });

  it('score equals min(|aToB|, |bToA|)', () => {
    // A→B: 3 stickers, B→A: 2 stickers → score = 2
    const userA = makeUser({
      userId: 'A',
      stickers: [
        { number: 'URU1', count: 2 },
        { number: 'URU2', count: 2 },
        { number: 'URU3', count: 2 },
        { number: 'ARG1', count: 0 },
        { number: 'ARG2', count: 0 },
      ],
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [
        { number: 'ARG1', count: 2 },
        { number: 'ARG2', count: 2 },
        { number: 'URU1', count: 0 },
        { number: 'URU2', count: 0 },
        { number: 'URU3', count: 0 },
      ],
    });

    const result = computeMatch(userA, userB);

    expect(result!.score).toBe(2);
    expect(result!.aToB).toHaveLength(3);
    expect(result!.bToA).toHaveLength(2);
  });

  it('returns null when A has nothing B needs', () => {
    const userA = makeUser({
      userId: 'A',
      stickers: [{ number: 'URU1', count: 2 }], // A has spare
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [
        { number: 'URU1', count: 1 }, // B already has URU1 (not a 0)
        { number: 'ARG1', count: 2 }, // B has spare but A doesn't need
      ],
    });

    expect(computeMatch(userA, userB)).toBeNull();
  });

  it('returns null when B has nothing A needs', () => {
    // A already owns URU1 (count=1), so B's URU1 spare is useless to A
    const userA = makeUser({
      userId: 'A',
      stickers: [
        { number: 'ARG1', count: 2 }, // A has ARG1 spare
        { number: 'URU1', count: 1 }, // A already has URU1
      ],
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [
        { number: 'URU1', count: 2 }, // B has URU1 spare (useless to A)
        { number: 'ARG1', count: 0 }, // B needs ARG1
      ],
    });
    // aToB = [ARG1], bToA = [] → no match
    expect(computeMatch(userA, userB)).toBeNull();
  });

  it('returns null when both collections are empty', () => {
    const userA = makeUser({ userId: 'A', stickers: [] });
    const userB = makeUser({ userId: 'B', stickers: [] });
    expect(computeMatch(userA, userB)).toBeNull();
  });

  it('returns null when A has no spares to offer (all count=1, offerUniques=false)', () => {
    const userA = makeUser({
      userId: 'A',
      offerUniques: false,
      stickers: [{ number: 'URU1', count: 1 }], // unique, not offered
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [
        { number: 'URU1', count: 0 }, // B needs URU1
        { number: 'ARG1', count: 2 }, // B has spare
      ],
    });
    // aToB = [] because URU1 count=1 is not available when offerUniques=false
    expect(computeMatch(userA, userB)).toBeNull();
  });

  it('includes count=1 stickers in available when offerUniques=true', () => {
    const userA = makeUser({
      userId: 'A',
      offerUniques: true,
      stickers: [{ number: 'URU1', count: 1 }], // unique, but offered
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [
        { number: 'URU1', count: 0 }, // B needs URU1
        { number: 'ARG1', count: 2 }, // B has spare for A
      ],
    });

    const result = computeMatch(userA, userB);
    expect(result).not.toBeNull();
    expect(result!.aToB).toContain('URU1');
  });

  it('treats sticker absent from B list as B needing it (count=0 default)', () => {
    // URU1 is NOT in B's sticker list at all → B implicitly needs it
    const userA = makeUser({
      userId: 'A',
      stickers: [{ number: 'URU1', count: 2 }],
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [{ number: 'ARG1', count: 2 }], // URU1 not in list
    });

    // A has URU1 spare, B doesn't have URU1 in list → B needs it
    // B has ARG1 spare, A doesn't have ARG1 in list → A needs it
    const result = computeMatch(userA, userB);
    expect(result).not.toBeNull();
    expect(result!.aToB).toContain('URU1');
    expect(result!.bToA).toContain('ARG1');
  });

  it('does not include stickers B already has (count > 0) in aToB', () => {
    const userA = makeUser({
      userId: 'A',
      stickers: [{ number: 'URU1', count: 3 }],
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [
        { number: 'URU1', count: 1 }, // B already has URU1
        { number: 'ARG1', count: 2 },
      ],
    });
    // aToB = [] because B already has URU1
    expect(computeMatch(userA, userB)).toBeNull();
  });

  it('handles symmetric match (same score on both sides)', () => {
    const userA = makeUser({
      userId: 'A',
      stickers: [
        { number: 'URU1', count: 2 },
        { number: 'URU2', count: 2 },
      ],
    });
    const userB = makeUser({
      userId: 'B',
      stickers: [
        { number: 'ARG1', count: 2 },
        { number: 'ARG2', count: 2 },
      ],
    });

    const result = computeMatch(userA, userB);
    expect(result!.score).toBe(2);
    expect(result!.aToB).toHaveLength(2);
    expect(result!.bToA).toHaveLength(2);
  });
});

// ─── isActiveUser ────────────────────────────────────────────────────────────

describe('isActiveUser', () => {
  it('returns true when user was seen today', () => {
    expect(isActiveUser({ lastSeenAt: NOW }, { now: NOW })).toBe(true);
  });

  it('returns true when user was seen 29 days ago', () => {
    const lastSeenAt = new Date(NOW.getTime() - 29 * 24 * 60 * 60 * 1000);
    expect(isActiveUser({ lastSeenAt }, { now: NOW })).toBe(true);
  });

  it('returns false when user was seen exactly 30 days ago (at cutoff)', () => {
    const lastSeenAt = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(isActiveUser({ lastSeenAt }, { now: NOW })).toBe(false);
  });

  it('returns false when user was seen 31 days ago', () => {
    const lastSeenAt = new Date(NOW.getTime() - 31 * 24 * 60 * 60 * 1000);
    expect(isActiveUser({ lastSeenAt }, { now: NOW })).toBe(false);
  });

  it('uses custom activeDays', () => {
    const lastSeenAt = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
    expect(isActiveUser({ lastSeenAt }, { activeDays: 7, now: NOW })).toBe(false);
    expect(isActiveUser({ lastSeenAt }, { activeDays: 9, now: NOW })).toBe(true);
  });

  it('defaults now to current time when not provided', () => {
    // User seen 1 hour ago → definitely active
    const lastSeenAt = new Date(Date.now() - 60 * 60 * 1000);
    expect(isActiveUser({ lastSeenAt })).toBe(true);
  });
});

// ─── isSameLocation ──────────────────────────────────────────────────────────

describe('isSameLocation', () => {
  const mvd = { city: 'Montevideo', neighborhood: 'Pocitos' };
  const mvdOtherHood = { city: 'Montevideo', neighborhood: 'Parque Batlle' };
  const canelones = { city: 'Canelones', neighborhood: 'Las Piedras' };
  const noCity = { city: null, neighborhood: null };
  const noNeighborhood = { city: 'Montevideo', neighborhood: null };

  describe('radius: country', () => {
    it('always returns true', () => {
      expect(isSameLocation(mvd, canelones, 'country')).toBe(true);
      expect(isSameLocation(noCity, noCity, 'country')).toBe(true);
    });
  });

  describe('radius: department', () => {
    it('returns true when both in same city', () => {
      expect(isSameLocation(mvd, mvdOtherHood, 'department')).toBe(true);
    });

    it('returns false when cities differ', () => {
      expect(isSameLocation(mvd, canelones, 'department')).toBe(false);
    });

    it('returns false when userA has no city', () => {
      expect(isSameLocation(noCity, mvd, 'department')).toBe(false);
    });

    it('returns false when userB has no city', () => {
      expect(isSameLocation(mvd, noCity, 'department')).toBe(false);
    });
  });

  describe('radius: neighborhood', () => {
    it('returns true when same city and same neighborhood', () => {
      expect(isSameLocation(mvd, mvd, 'neighborhood')).toBe(true);
    });

    it('returns false when same city but different neighborhood', () => {
      expect(isSameLocation(mvd, mvdOtherHood, 'neighborhood')).toBe(false);
    });

    it('returns false when userA has no neighborhood', () => {
      expect(isSameLocation(noNeighborhood, mvd, 'neighborhood')).toBe(false);
    });

    it('returns false when userB has no neighborhood', () => {
      expect(isSameLocation(mvd, noNeighborhood, 'neighborhood')).toBe(false);
    });

    it('returns false when cities differ', () => {
      expect(isSameLocation(mvd, canelones, 'neighborhood')).toBe(false);
    });
  });
});

// ─── findMatchesForUser ──────────────────────────────────────────────────────

describe('findMatchesForUser', () => {
  const OPTS = { now: NOW };

  function makeCandidate(
    userId: string,
    overrides: Partial<UserCollectionInput> = {},
  ): UserCollectionInput {
    return makeUser({ userId, ...overrides });
  }

  it('returns empty array when pool is empty', () => {
    const target = makeCandidate('T');
    expect(findMatchesForUser(target, [], OPTS)).toEqual([]);
  });

  it('filters out users not participating in matchmaking (RF-304)', () => {
    const target = makeCandidate('T', {
      stickers: [{ number: 'URU1', count: 0 }],
    });
    const candidate = makeCandidate('C', {
      participatesInMatchmaking: false,
      stickers: [{ number: 'URU1', count: 2 }],
    });
    expect(findMatchesForUser(target, [candidate], OPTS)).toEqual([]);
  });

  it('filters out inactive users (RF-303)', () => {
    const target = makeCandidate('T', {
      stickers: [{ number: 'URU1', count: 0 }],
    });
    const inactive = makeCandidate('C', {
      lastSeenAt: new Date(NOW.getTime() - 31 * 24 * 60 * 60 * 1000),
      stickers: [{ number: 'URU1', count: 2 }],
    });
    expect(findMatchesForUser(target, [inactive], OPTS)).toEqual([]);
  });

  it('filters out users in a different department (RF-302, default radius)', () => {
    const target = makeCandidate('T', {
      city: 'Montevideo',
      stickers: [{ number: 'URU1', count: 0 }],
    });
    const otherDept = makeCandidate('C', {
      city: 'Canelones',
      stickers: [{ number: 'URU1', count: 2 }],
    });
    expect(findMatchesForUser(target, [otherDept], OPTS)).toEqual([]);
  });

  it('includes users from other departments when radius=country (RF-302)', () => {
    const target = makeCandidate('T', {
      city: 'Montevideo',
      stickers: [
        { number: 'URU1', count: 0 },
        { number: 'ARG1', count: 2 },
      ],
    });
    const otherDept = makeCandidate('C', {
      city: 'Canelones',
      stickers: [
        { number: 'URU1', count: 2 },
        { number: 'ARG1', count: 0 },
      ],
    });
    const results = findMatchesForUser(target, [otherDept], {
      ...OPTS,
      radius: 'country',
    });
    expect(results).toHaveLength(1);
  });

  it('returns matches sorted by score descending', () => {
    const target = makeCandidate('T', {
      stickers: [
        { number: 'URU1', count: 0 },
        { number: 'URU2', count: 0 },
        { number: 'URU3', count: 0 },
        { number: 'BRA1', count: 2 },
        { number: 'BRA2', count: 2 },
        { number: 'BRA3', count: 2 },
      ],
    });

    // highScore: can exchange 3 stickers each way
    const highScore = makeCandidate('C1', {
      stickers: [
        { number: 'URU1', count: 2 },
        { number: 'URU2', count: 2 },
        { number: 'URU3', count: 2 },
        { number: 'BRA1', count: 0 },
        { number: 'BRA2', count: 0 },
        { number: 'BRA3', count: 0 },
      ],
    });

    // lowScore: can exchange 1 sticker each way
    const lowScore = makeCandidate('C2', {
      stickers: [
        { number: 'URU1', count: 2 },
        { number: 'BRA1', count: 0 },
      ],
    });

    const results = findMatchesForUser(target, [lowScore, highScore], OPTS);

    expect(results).toHaveLength(2);
    expect(results[0].score).toBe(3);
    expect(results[1].score).toBe(1);
  });

  it('excludes candidates that produce no match (aToB or bToA empty)', () => {
    const target = makeCandidate('T', {
      stickers: [
        { number: 'URU1', count: 2 }, // has spare
        // needs nothing from candidate
      ],
    });
    const noMatch = makeCandidate('C', {
      stickers: [
        { number: 'URU1', count: 0 }, // needs URU1 (A can give)
        // but has nothing for A
      ],
    });
    expect(findMatchesForUser(target, [noMatch], OPTS)).toEqual([]);
  });

  it('uses custom activeDays option', () => {
    const target = makeCandidate('T', {
      stickers: [
        { number: 'URU1', count: 0 },
        { number: 'ARG1', count: 2 },
      ],
    });
    // Seen 8 days ago
    const candidate = makeCandidate('C', {
      lastSeenAt: new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000),
      stickers: [
        { number: 'URU1', count: 2 },
        { number: 'ARG1', count: 0 },
      ],
    });

    // With activeDays=7 → candidate is inactive
    expect(findMatchesForUser(target, [candidate], { ...OPTS, activeDays: 7 })).toEqual([]);

    // With activeDays=9 → candidate is active
    expect(findMatchesForUser(target, [candidate], { ...OPTS, activeDays: 9 })).toHaveLength(1);
  });
});
