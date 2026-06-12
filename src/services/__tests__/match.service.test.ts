import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  upsert: vi.fn(),
  findById: vi.fn(),
  findByUsers: vi.fn(),
  findByIdWithPartners: vi.fn(),
  findActiveByUser: vi.fn(),
  findActiveByUserWithPartners: vi.fn(),
  updateStatus: vi.fn(),
  markInactiveByLastSeen: vi.fn(),
  findMatchmakingProfile: vi.fn(),
  findCandidatePool: vi.fn(),
  pruneStaleForUser: vi.fn(),
}));

const mockMessageRepo = vi.hoisted(() => ({
  countUnread: vi.fn(),
}));

const mockNotificationService = vi.hoisted(() => ({
  createNotification: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/repositories/match.repository', () => ({
  matchRepository: mockRepo,
}));

vi.mock('@/repositories/message.repository', () => ({
  messageRepository: mockMessageRepo,
}));

vi.mock('@/services/notification.service', () => ({
  notificationService: mockNotificationService,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

import { matchService, MAX_POOL_SIZE } from '../match.service';
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

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing match (new match scenario) and notifications resolve cleanly
  mockRepo.findByUsers.mockResolvedValue(null);
  mockNotificationService.createNotification.mockResolvedValue({ id: 'notif-1' });
  mockMessageRepo.countUnread.mockResolvedValue(0);
  mockRepo.pruneStaleForUser.mockResolvedValue(0);
});

describe('matchService.saveMatchResult', () => {
  it('inserts a match and reports created: true', async () => {
    mockRepo.upsert.mockResolvedValue({ match: makeDbMatch(), created: true });

    const result = await matchService.saveMatchResult(makeMatchResult());

    expect(mockRepo.upsert).toHaveBeenCalledOnce();
    const call = mockRepo.upsert.mock.calls[0][0];
    expect(call.aToB).toEqual(['URU1', 'ARG2', 'BRA3']);
    expect(call.bToA).toEqual(['ESP4', 'FRA5', 'GER6']);
    expect(call.score).toBe(3);
    expect(result).toEqual({ created: true });
  });

  it('normalizes key when userAId > userBId (lexicographic swap)', async () => {
    const result = makeMatchResult({ userAId: 'zzz-b', userBId: 'aaa-a' });
    mockRepo.upsert.mockResolvedValue({
      match: makeDbMatch({
        userAId: 'aaa-a',
        userBId: 'zzz-b',
        aToB: result.bToA,
        bToA: result.aToB,
      }),
      created: true,
    });

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
    mockRepo.upsert.mockResolvedValue({ match: makeDbMatch(), created: true });

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

  it('creates new_match notifications for both users when the match is new', async () => {
    mockRepo.upsert.mockResolvedValue({
      match: makeDbMatch({ id: 'match-new', score: 3 }),
      created: true,
    });

    await matchService.saveMatchResult(makeMatchResult());

    expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith('user-a', 'new_match', {
      matchId: 'match-new',
      score: 3,
    });
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith('user-b', 'new_match', {
      matchId: 'match-new',
      score: 3,
    });
  });

  it('does not create notifications when the match already existed (created: false)', async () => {
    mockRepo.upsert.mockResolvedValue({ match: null, created: false });

    const result = await matchService.saveMatchResult(makeMatchResult());

    expect(result).toEqual({ created: false });
    expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
  });

  it('skips the notification for a recipient who turned notifyOnMatch off', async () => {
    mockRepo.upsert.mockResolvedValue({
      match: makeDbMatch({ id: 'match-new', score: 2 }),
      created: true,
    });

    await matchService.saveMatchResult(makeMatchResult(), { 'user-a': false, 'user-b': true });

    expect(mockNotificationService.createNotification).toHaveBeenCalledOnce();
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith('user-b', 'new_match', {
      matchId: 'match-new',
      score: 2,
    });
  });

  it('still resolves with created: true even if notification creation fails', async () => {
    mockRepo.upsert.mockResolvedValue({ match: makeDbMatch(), created: true });
    mockNotificationService.createNotification.mockRejectedValue(new Error('notification error'));

    const result = await matchService.saveMatchResult(makeMatchResult());

    expect(result).toEqual({ created: true });
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

describe('matchService.getActiveMatchesWithPartners', () => {
  function makePartner(id: string, overrides: object = {}) {
    return {
      id,
      email: `${id}@example.com`,
      username: id,
      name: `User ${id}`,
      avatarUrl: null,
      bio: null,
      city: 'Montevideo',
      neighborhood: 'Centro',
      whatsapp: null,
      lat: null,
      lng: null,
      geoGranularity: 'none',
      role: 'user',
      publicProfile: false,
      isSuspended: false,
      notifyOnMatch: true,
      emailFrequency: 'instant',
      pushEnabled: false,
      pushSubscription: null,
      participatesInMatchmaking: true,
      matchRadius: 'department',
      offerUniques: false,
      acceptUnbalanced: true,
      isPro: false,
      proExpiresAt: null,
      reputation: 4.5,
      tradesCompleted: 2,
      createdAt: NOW,
      lastSeenAt: NOW,
      onboardingDoneAt: null,
      ...overrides,
    };
  }

  function makeMatchWithPartners(userAId: string, userBId: string, overrides: object = {}) {
    return {
      ...makeDbMatch({ userAId, userBId }),
      userA: makePartner(userAId),
      userB: makePartner(userBId),
      ...overrides,
    };
  }

  it('returns match from user-a perspective (youGive=aToB, youGet=bToA)', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([
      makeMatchWithPartners('user-a', 'user-b'),
    ]);

    const results = await matchService.getActiveMatchesWithPartners('user-a');

    expect(results).toHaveLength(1);
    expect(results[0].youGive).toEqual(['URU1', 'ARG2', 'BRA3']);
    expect(results[0].youGet).toEqual(['ESP4', 'FRA5', 'GER6']);
    expect(results[0].partner.id).toBe('user-b');
  });

  it('returns match from user-b perspective (youGive=bToA, youGet=aToB)', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([
      makeMatchWithPartners('user-a', 'user-b'),
    ]);

    const results = await matchService.getActiveMatchesWithPartners('user-b');

    expect(results[0].youGive).toEqual(['ESP4', 'FRA5', 'GER6']);
    expect(results[0].youGet).toEqual(['URU1', 'ARG2', 'BRA3']);
    expect(results[0].partner.id).toBe('user-a');
  });

  it('maps partner public fields correctly', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([
      makeMatchWithPartners('user-a', 'user-b', {
        userB: makePartner('user-b', { username: 'gonza', reputation: 4.8, tradesCompleted: 5 }),
      }),
    ]);

    const results = await matchService.getActiveMatchesWithPartners('user-a');

    expect(results[0].partner.username).toBe('gonza');
    expect(results[0].partner.reputation).toBe(4.8);
    expect(results[0].partner.tradesCompleted).toBe(5);
  });

  it('forwards partner bio', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([
      makeMatchWithPartners('user-a', 'user-b', {
        userB: makePartner('user-b', { bio: 'Coleccionista desde siempre' }),
      }),
    ]);

    const results = await matchService.getActiveMatchesWithPartners('user-a');

    expect(results[0].partner.bio).toBe('Coleccionista desde siempre');
  });

  it('returns empty array when user has no active matches', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([]);
    const results = await matchService.getActiveMatchesWithPartners('user-x');
    expect(results).toEqual([]);
  });

  it('serialises dates to ISO strings', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([
      makeMatchWithPartners('user-a', 'user-b'),
    ]);

    const results = await matchService.getActiveMatchesWithPartners('user-a');

    expect(results[0].createdAt).toBe(NOW.toISOString());
    expect(results[0].lastUpdated).toBe(NOW.toISOString());
  });

  it('includes unreadCount from messageRepository.countUnread', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([
      makeMatchWithPartners('user-a', 'user-b', { id: 'match-unread' }),
    ]);
    mockMessageRepo.countUnread.mockResolvedValue(4);

    const results = await matchService.getActiveMatchesWithPartners('user-a');

    expect(mockMessageRepo.countUnread).toHaveBeenCalledWith('match-unread', 'user-a');
    expect(results[0].unreadCount).toBe(4);
  });

  it('sets unreadCount 0 when no unread messages', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([
      makeMatchWithPartners('user-a', 'user-b'),
    ]);
    mockMessageRepo.countUnread.mockResolvedValue(0);

    const results = await matchService.getActiveMatchesWithPartners('user-a');

    expect(results[0].unreadCount).toBe(0);
  });

  it('fetches unread counts in parallel for multiple matches', async () => {
    mockRepo.findActiveByUserWithPartners.mockResolvedValue([
      makeMatchWithPartners('user-a', 'user-b', { id: 'match-1' }),
      makeMatchWithPartners('user-a', 'user-c', {
        id: 'match-2',
        score: 1,
        aToB: ['X'],
        bToA: ['Y'],
      }),
    ]);
    mockMessageRepo.countUnread.mockResolvedValueOnce(2).mockResolvedValueOnce(0);

    const results = await matchService.getActiveMatchesWithPartners('user-a');

    expect(results[0].unreadCount).toBe(2);
    expect(results[1].unreadCount).toBe(0);
    expect(mockMessageRepo.countUnread).toHaveBeenCalledTimes(2);
  });
});

describe('matchService.getMatchDetailForUser', () => {
  function makePartner(id: string, overrides: object = {}) {
    return {
      id,
      email: `${id}@example.com`,
      username: id,
      name: `User ${id}`,
      avatarUrl: null,
      bio: null,
      city: 'Montevideo',
      neighborhood: 'Centro',
      whatsapp: null,
      lat: null,
      lng: null,
      geoGranularity: 'none',
      role: 'user',
      publicProfile: false,
      isSuspended: false,
      notifyOnMatch: true,
      emailFrequency: 'instant',
      pushEnabled: false,
      pushSubscription: null,
      participatesInMatchmaking: true,
      matchRadius: 'department',
      offerUniques: false,
      acceptUnbalanced: true,
      isPro: false,
      proExpiresAt: null,
      reputation: 4.5,
      tradesCompleted: 2,
      createdAt: NOW,
      lastSeenAt: NOW,
      onboardingDoneAt: null,
      ...overrides,
    };
  }

  function makeMatchWithPartners(userAId: string, userBId: string, overrides: object = {}) {
    return {
      ...makeDbMatch({ userAId, userBId }),
      userA: makePartner(userAId),
      userB: makePartner(userBId),
      ...overrides,
    };
  }

  it('returns match from user-a perspective when user is userA', async () => {
    mockRepo.findByIdWithPartners.mockResolvedValue(makeMatchWithPartners('user-a', 'user-b'));

    const result = await matchService.getMatchDetailForUser('match-1', 'user-a');

    expect(result).not.toBeNull();
    expect(result!.youGive).toEqual(['URU1', 'ARG2', 'BRA3']);
    expect(result!.youGet).toEqual(['ESP4', 'FRA5', 'GER6']);
    expect(result!.partner.id).toBe('user-b');
    expect(result!.unreadCount).toBe(0);
  });

  it('returns match from user-b perspective when user is userB', async () => {
    mockRepo.findByIdWithPartners.mockResolvedValue(makeMatchWithPartners('user-a', 'user-b'));

    const result = await matchService.getMatchDetailForUser('match-1', 'user-b');

    expect(result).not.toBeNull();
    expect(result!.youGive).toEqual(['ESP4', 'FRA5', 'GER6']);
    expect(result!.youGet).toEqual(['URU1', 'ARG2', 'BRA3']);
    expect(result!.partner.id).toBe('user-a');
  });

  it('returns null when match does not exist', async () => {
    mockRepo.findByIdWithPartners.mockResolvedValue(null);

    const result = await matchService.getMatchDetailForUser('nope', 'user-a');

    expect(result).toBeNull();
  });

  it('returns null when user is not a participant of the match', async () => {
    mockRepo.findByIdWithPartners.mockResolvedValue(makeMatchWithPartners('user-a', 'user-b'));

    const result = await matchService.getMatchDetailForUser('match-1', 'user-c');

    expect(result).toBeNull();
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

describe('matchService.recomputeForUser', () => {
  // Target offerable = count >= 2 (offerUniques default false). Absent number = "needs".
  function makeProfile(overrides: object = {}) {
    return {
      id: 'user-a',
      city: 'Montevideo',
      neighborhood: 'Pocitos',
      matchRadius: 'department',
      offerUniques: false,
      participatesInMatchmaking: true,
      isSuspended: false,
      notifyOnMatch: true,
      lastSeenAt: NOW,
      stickers: [] as { number: string; count: number }[],
      ...overrides,
    };
  }
  function makeCandidate(overrides: object = {}) {
    return {
      id: 'user-b',
      city: 'Montevideo',
      neighborhood: 'Pocitos',
      offerUniques: false,
      participatesInMatchmaking: true,
      notifyOnMatch: true,
      lastSeenAt: NOW,
      stickers: [] as { number: string; count: number }[],
      ...overrides,
    };
  }

  beforeEach(() => {
    // saveMatchResult runs for real → echo the upsert input into a fresh (created) DB row.
    mockRepo.upsert.mockImplementation(async (input) => ({
      match: makeDbMatch({ ...input }),
      created: true,
    }));
  });

  it('arms the pool, runs the engine and persists each match (full chain + notifications)', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ id: 'user-a', stickers: [{ number: 'URU1', count: 2 }] }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ id: 'user-b', stickers: [{ number: 'ARG2', count: 2 }] }),
    ]);

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 1 });
    expect(mockRepo.upsert).toHaveBeenCalledTimes(1);
    // user-a < user-b → no swap; A gives URU1, gets ARG2.
    const call = mockRepo.upsert.mock.calls[0][0];
    expect(call.userAId).toBe('user-a');
    expect(call.userBId).toBe('user-b');
    expect(call.aToB).toEqual(['URU1']);
    expect(call.bToA).toEqual(['ARG2']);
    expect(call.score).toBe(1);
    // new match → notification to both parties (RF-409)
    expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
  });

  it('writes nothing when no candidate is complementary', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ stickers: [{ number: 'URU1', count: 2 }] }),
    );
    // candidate already has URU1 and offers nothing the target needs
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ stickers: [{ number: 'URU1', count: 2 }] }),
    ]);

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 0 });
    expect(mockRepo.upsert).not.toHaveBeenCalled();
    expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
  });

  it('returns {matched:0} and skips the pool when the target does not exist', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(null);

    const result = await matchService.recomputeForUser('ghost', NOW);

    expect(result).toEqual({ matched: 0 });
    expect(mockRepo.findCandidatePool).not.toHaveBeenCalled();
  });

  it('returns {matched:0} and skips the pool when the target opted out of matchmaking', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ participatesInMatchmaking: false }),
    );

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 0 });
    expect(mockRepo.findCandidatePool).not.toHaveBeenCalled();
  });

  it('returns {matched:0} and skips the pool when the target is suspended', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(makeProfile({ isSuspended: true }));

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 0 });
    expect(mockRepo.findCandidatePool).not.toHaveBeenCalled();
  });

  it('only notifies recipients whose notifyOnMatch is on', async () => {
    // Target opted out of match notifications; the candidate kept them on.
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ notifyOnMatch: false, stickers: [{ number: 'URU1', count: 2 }] }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({
        id: 'user-b',
        notifyOnMatch: true,
        stickers: [{ number: 'ARG2', count: 2 }],
      }),
    ]);

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 1 });
    expect(mockNotificationService.createNotification).toHaveBeenCalledOnce();
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      'user-b',
      'new_match',
      expect.objectContaining({ matchId: expect.any(String) }),
    );
  });

  it('returns {matched:0} and skips the pool when radius is local but the target has no city', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ matchRadius: 'department', city: null }),
    );

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 0 });
    expect(mockRepo.findCandidatePool).not.toHaveBeenCalled();
  });

  it('logs a warning and bails on an unknown matchRadius value (defensive cast)', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(makeProfile({ matchRadius: 'galaxy' }));

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 0 });
    expect(mockRepo.findCandidatePool).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'recompute: invalid matchRadius',
      expect.objectContaining({ radius: 'galaxy' }),
    );
  });

  it('loads the pool without a city filter when radius is country', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ matchRadius: 'country', stickers: [{ number: 'URU1', count: 2 }] }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      // different city — country radius must still match
      makeCandidate({ city: 'Salto', stickers: [{ number: 'ARG2', count: 2 }] }),
    ]);

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 1 });
    const poolCall = mockRepo.findCandidatePool.mock.calls[0];
    expect(poolCall[0]).toBe('user-a');
    expect(poolCall[1].city).toBeNull();
    expect(poolCall[1].cutoffDate).toBeInstanceOf(Date);
    expect(poolCall[1].take).toBe(MAX_POOL_SIZE);
  });

  // RF-318: location fallback. Complementary sets so a location match yields matched:1.
  const complementaryTarget = [{ number: 'URU1', count: 2 }];
  const complementaryCand = [{ number: 'ARG2', count: 2 }];

  it('RF-318 (a): same neighborhood + radius neighborhood → match', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({
        matchRadius: 'neighborhood',
        neighborhood: 'Pocitos',
        stickers: complementaryTarget,
      }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ neighborhood: 'Pocitos', stickers: complementaryCand }),
    ]);
    expect(await matchService.recomputeForUser('user-a', NOW)).toEqual({ matched: 1 });
  });

  it('RF-318 (b): different neighborhood + radius neighborhood → no match', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({
        matchRadius: 'neighborhood',
        neighborhood: 'Pocitos',
        stickers: complementaryTarget,
      }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ neighborhood: 'Centro', stickers: complementaryCand }),
    ]);
    expect(await matchService.recomputeForUser('user-a', NOW)).toEqual({ matched: 0 });
  });

  it('RF-318 (c): candidate without neighborhood, same dept, radius department → match', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({
        matchRadius: 'department',
        neighborhood: 'Pocitos',
        stickers: complementaryTarget,
      }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ neighborhood: null, stickers: complementaryCand }),
    ]);
    expect(await matchService.recomputeForUser('user-a', NOW)).toEqual({ matched: 1 });
  });

  it('RF-318 (d): both without neighborhood, same dept, radius department → match', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ matchRadius: 'department', neighborhood: null, stickers: complementaryTarget }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ neighborhood: null, stickers: complementaryCand }),
    ]);
    expect(await matchService.recomputeForUser('user-a', NOW)).toEqual({ matched: 1 });
  });

  it('RF-318 (e): different department → no match (radius department)', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ matchRadius: 'department', city: 'Montevideo', stickers: complementaryTarget }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ city: 'Canelones', stickers: complementaryCand }),
    ]);
    expect(await matchService.recomputeForUser('user-a', NOW)).toEqual({ matched: 0 });
  });

  it('filters inactive candidates via the engine (lastSeenAt older than 30 days)', async () => {
    const stale = new Date(NOW.getTime() - 31 * 24 * 60 * 60 * 1000);
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ matchRadius: 'country', stickers: complementaryTarget }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ lastSeenAt: stale, stickers: complementaryCand }),
    ]);

    expect(await matchService.recomputeForUser('user-a', NOW)).toEqual({ matched: 0 });
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });

  it('persists multiple matches ordered by score descending', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({
        matchRadius: 'country',
        stickers: [
          { number: 'URU1', count: 2 },
          { number: 'URU2', count: 2 },
          { number: 'URU3', count: 2 },
        ],
      }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      // low score: offers 1 the target needs
      makeCandidate({ id: 'user-lo', stickers: [{ number: 'ARG1', count: 2 }] }),
      // high score: offers 2 the target needs
      makeCandidate({
        id: 'user-hi',
        stickers: [
          { number: 'ARG1', count: 2 },
          { number: 'ARG2', count: 2 },
        ],
      }),
    ]);

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 2 });
    expect(mockRepo.upsert).toHaveBeenCalledTimes(2);
    const scores = mockRepo.upsert.mock.calls.map((c) => c[0].score);
    expect(scores).toEqual([2, 1]);
  });

  it('rethrows and logs attempted count if a saveMatchResult fails mid-loop', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({
        matchRadius: 'country',
        stickers: [
          { number: 'URU1', count: 2 },
          { number: 'URU2', count: 2 },
        ],
      }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({
        id: 'user-hi',
        stickers: [
          { number: 'ARG1', count: 2 },
          { number: 'ARG2', count: 2 },
        ],
      }),
      makeCandidate({ id: 'user-lo', stickers: [{ number: 'ARG1', count: 2 }] }),
    ]);
    mockRepo.upsert
      .mockResolvedValueOnce({ match: makeDbMatch(), created: true })
      .mockRejectedValueOnce(new Error('db down'));

    await expect(matchService.recomputeForUser('user-a', NOW)).rejects.toThrow('db down');
    // The first save persisted before the second threw → log the real count, not the total.
    expect(mockLogger.error).toHaveBeenCalledWith(
      'recompute: partial match persistence failed',
      expect.objectContaining({ persisted: 1, total: 2 }),
    );
  });

  it('truncates and warns when the pool exceeds MAX_POOL_SIZE', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ matchRadius: 'country', stickers: [] }),
    );
    const huge = Array.from({ length: MAX_POOL_SIZE + 1 }, (_, i) =>
      makeCandidate({ id: `c${i}`, stickers: [] }),
    );
    mockRepo.findCandidatePool.mockResolvedValue(huge);

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 0 });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'recompute: candidate pool truncated',
      expect.objectContaining({ poolSize: MAX_POOL_SIZE + 1, max: MAX_POOL_SIZE }),
    );
  });

  // RF-342: pruning de matches fantasma
  it('RF-342: prunes stale active matches after recompute with partner ids from results', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ stickers: [{ number: 'URU1', count: 2 }] }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ id: 'user-b', stickers: [{ number: 'ARG2', count: 2 }] }),
    ]);

    await matchService.recomputeForUser('user-a', NOW);

    expect(mockRepo.pruneStaleForUser).toHaveBeenCalledOnce();
    expect(mockRepo.pruneStaleForUser).toHaveBeenCalledWith('user-a', ['user-b']);
  });

  it('RF-342: calls pruneStaleForUser with empty array when no matches found', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ stickers: [{ number: 'URU1', count: 2 }] }),
    );
    // candidate has same sticker — no complementary match
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ id: 'user-b', stickers: [{ number: 'URU1', count: 2 }] }),
    ]);

    await matchService.recomputeForUser('user-a', NOW);

    expect(mockRepo.pruneStaleForUser).toHaveBeenCalledWith('user-a', []);
  });

  it('RF-342: pruning failure is non-fatal (logs and does not rethrow)', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(
      makeProfile({ stickers: [{ number: 'URU1', count: 2 }] }),
    );
    mockRepo.findCandidatePool.mockResolvedValue([
      makeCandidate({ id: 'user-b', stickers: [{ number: 'ARG2', count: 2 }] }),
    ]);
    mockRepo.pruneStaleForUser.mockRejectedValue(new Error('prune db error'));

    const result = await matchService.recomputeForUser('user-a', NOW);

    expect(result).toEqual({ matched: 1 });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'recompute: stale pruning failed',
      expect.objectContaining({ userId: 'user-a', error: expect.any(Error) }),
    );
  });

  it('RF-342: does not call pruneStaleForUser when recompute bails early (suspended user)', async () => {
    mockRepo.findMatchmakingProfile.mockResolvedValue(makeProfile({ isSuspended: true }));

    await matchService.recomputeForUser('user-a', NOW);

    expect(mockRepo.pruneStaleForUser).not.toHaveBeenCalled();
  });
});
