import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  upsert: vi.fn(),
  findById: vi.fn(),
  findActiveByUser: vi.fn(),
  updateStatus: vi.fn(),
  markInactiveByLastSeen: vi.fn(),
}));

vi.mock('@/repositories/match.repository', () => ({
  matchRepository: mockRepo,
}));

import { matchService } from '../match.service';
import type { MatchResult } from '@/types/match';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeDbMatch(overrides: object = {}) {
  return {
    id: 'match-1',
    userAId: 'user-a',
    userBId: 'user-b',
    score: 3,
    aToB: ['URU1', 'ARG2', 'BRA3'],
    bToA: ['ESP4', 'FRA5', 'GER6'],
    status: 'active',
    lastUpdated: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

function makeMatchResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    userAId: 'user-a',
    userBId: 'user-b',
    aToB: ['URU1', 'ARG2', 'BRA3'],
    bToA: ['ESP4', 'FRA5', 'GER6'],
    score: 3,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('matchService.saveMatchResult', () => {
  it('persists a match result and returns decoded record', async () => {
    mockRepo.upsert.mockResolvedValue(makeDbMatch());

    const result = await matchService.saveMatchResult(makeMatchResult());

    expect(mockRepo.upsert).toHaveBeenCalledOnce();
    expect(result.aToB).toEqual(['URU1', 'ARG2', 'BRA3']);
    expect(result.bToA).toEqual(['ESP4', 'FRA5', 'GER6']);
    expect(result.score).toBe(3);
  });

  it('normalizes key when userAId > userBId (lexicographic swap)', async () => {
    const result = makeMatchResult({ userAId: 'zzz-b', userBId: 'aaa-a' });
    mockRepo.upsert.mockResolvedValue(
      makeDbMatch({ userAId: 'aaa-a', userBId: 'zzz-b', aToB: result.bToA, bToA: result.aToB }),
    );

    await matchService.saveMatchResult(result);

    const call = mockRepo.upsert.mock.calls[0][0];
    // After normalization: aaa-a < zzz-b, so aaa-a is A
    expect(call.userAId).toBe('aaa-a');
    expect(call.userBId).toBe('zzz-b');
    // aToB from 'aaa-a' perspective = original bToA (what B was giving to A)
    expect(call.aToB).toEqual(result.bToA);
    expect(call.bToA).toEqual(result.aToB);
  });

  it('normalizes consistently so A→B and B→A produce the same upsert key', async () => {
    mockRepo.upsert.mockResolvedValue(makeDbMatch());

    const forward = makeMatchResult({ userAId: 'user-a', userBId: 'user-b' });
    const backward = makeMatchResult({
      userAId: 'user-b',
      userBId: 'user-a',
      aToB: forward.bToA,
      bToA: forward.aToB,
    });

    await matchService.saveMatchResult(forward);
    await matchService.saveMatchResult(backward);

    const call1 = mockRepo.upsert.mock.calls[0][0];
    const call2 = mockRepo.upsert.mock.calls[1][0];

    expect(call1.userAId).toBe(call2.userAId);
    expect(call1.userBId).toBe(call2.userBId);
    expect(call1.aToB).toEqual(call2.aToB);
    expect(call1.bToA).toEqual(call2.bToA);
  });
});

describe('matchService.getMatchById', () => {
  it('returns decoded match when found', async () => {
    mockRepo.findById.mockResolvedValue(makeDbMatch());

    const result = await matchService.getMatchById('match-1');
    expect(result).not.toBeNull();
    expect(result!.aToB).toEqual(['URU1', 'ARG2', 'BRA3']);
  });

  it('returns null when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const result = await matchService.getMatchById('nope');
    expect(result).toBeNull();
  });
});

describe('matchService.getActiveMatchesForUser', () => {
  it('returns decoded list of active matches', async () => {
    mockRepo.findActiveByUser.mockResolvedValue([
      makeDbMatch(),
      makeDbMatch({ id: 'match-2', score: 1 }),
    ]);

    const results = await matchService.getActiveMatchesForUser('user-a');
    expect(results).toHaveLength(2);
    expect(results[0].aToB).toEqual(['URU1', 'ARG2', 'BRA3']);
  });

  it('returns empty array when user has no active matches', async () => {
    mockRepo.findActiveByUser.mockResolvedValue([]);
    const results = await matchService.getActiveMatchesForUser('user-x');
    expect(results).toEqual([]);
  });
});

describe('matchService.completeMatch', () => {
  it('calls updateStatus with completed and returns decoded match', async () => {
    mockRepo.updateStatus.mockResolvedValue(makeDbMatch({ status: 'completed' }));

    const result = await matchService.completeMatch('match-1');

    expect(mockRepo.updateStatus).toHaveBeenCalledWith('match-1', 'completed');
    expect(result.status).toBe('completed');
  });
});

describe('matchService.markMatchInactive', () => {
  it('calls updateStatus with inactive', async () => {
    mockRepo.updateStatus.mockResolvedValue(makeDbMatch({ status: 'inactive' }));

    const result = await matchService.markMatchInactive('match-1');

    expect(mockRepo.updateStatus).toHaveBeenCalledWith('match-1', 'inactive');
    expect(result.status).toBe('inactive');
  });
});

describe('matchService.cleanupExpiredMatches', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls markInactiveByLastSeen with 30-day cutoff by default', async () => {
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    mockRepo.markInactiveByLastSeen.mockResolvedValue(3);

    const result = await matchService.cleanupExpiredMatches();

    expect(mockRepo.markInactiveByLastSeen).toHaveBeenCalledOnce();
    const cutoff: Date = mockRepo.markInactiveByLastSeen.mock.calls[0][0];
    const expected = new Date('2026-06-01T12:00:00Z');
    expected.setDate(expected.getDate() - 30);
    expect(cutoff.getTime()).toBe(expected.getTime());
    expect(result).toBe(3);
  });

  it('respects custom inactiveDays', async () => {
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    mockRepo.markInactiveByLastSeen.mockResolvedValue(1);

    const result = await matchService.cleanupExpiredMatches(7);

    const cutoff: Date = mockRepo.markInactiveByLastSeen.mock.calls[0][0];
    const expected = new Date('2026-06-01T12:00:00Z');
    expected.setDate(expected.getDate() - 7);
    expect(cutoff.getTime()).toBe(expected.getTime());
    expect(result).toBe(1);
  });

  it('returns count of marked inactive matches', async () => {
    mockRepo.markInactiveByLastSeen.mockResolvedValue(42);
    const count = await matchService.cleanupExpiredMatches();
    expect(count).toBe(42);
  });
});
