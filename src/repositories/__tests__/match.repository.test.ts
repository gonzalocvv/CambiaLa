import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMatchPrisma = vi.hoisted(() => ({
  create: vi.fn(),
  upsert: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));

const mockUserPrisma = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { match: mockMatchPrisma, user: mockUserPrisma },
}));

import { Prisma } from '@prisma/client';

import { matchRepository } from '../match.repository';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeP2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

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

beforeEach(() => vi.clearAllMocks());

describe('matchRepository.upsert', () => {
  it('inserts a new match with status active and returns created: true', async () => {
    const db = makeDbMatch();
    mockMatchPrisma.create.mockResolvedValue(db);

    const result = await matchRepository.upsert({
      userAId: 'user-a',
      userBId: 'user-b',
      aToB: ['URU1', 'ARG2', 'BRA3'],
      bToA: ['ESP4', 'FRA5', 'GER6'],
      score: 3,
    });

    expect(mockMatchPrisma.create).toHaveBeenCalledOnce();
    const call = mockMatchPrisma.create.mock.calls[0][0];
    expect(call.data.status).toBe('active');
    expect(call.data.score).toBe(3);
    expect(call.data.userAId).toBe('user-a');
    expect(call.data.userBId).toBe('user-b');
    expect(result).toEqual({ match: db, created: true });
    expect(mockMatchPrisma.updateMany).not.toHaveBeenCalled();
  });

  it('reactivates only non-terminal matches on unique conflict and returns created: false', async () => {
    mockMatchPrisma.create.mockRejectedValue(makeP2002());
    mockMatchPrisma.updateMany.mockResolvedValue({ count: 1 });

    const result = await matchRepository.upsert({
      userAId: 'user-a',
      userBId: 'user-b',
      aToB: ['URU1'],
      bToA: ['ESP4'],
      score: 5,
    });

    const call = mockMatchPrisma.updateMany.mock.calls[0][0];
    // 'completed'/'trading' are excluded by the status filter — the engine must not
    // resurrect a finished or in-progress trade on a later recompute.
    expect(call.where).toEqual({
      userAId: 'user-a',
      userBId: 'user-b',
      status: { in: ['active', 'inactive'] },
    });
    expect(call.data.status).toBe('active');
    expect(call.data.score).toBe(5);
    expect(result).toEqual({ match: null, created: false });
  });

  it('returns created: false when the existing match is terminal (updateMany matches nothing)', async () => {
    mockMatchPrisma.create.mockRejectedValue(makeP2002());
    mockMatchPrisma.updateMany.mockResolvedValue({ count: 0 });

    const result = await matchRepository.upsert({
      userAId: 'user-a',
      userBId: 'user-b',
      aToB: ['URU1'],
      bToA: ['ESP4'],
      score: 2,
    });

    expect(result).toEqual({ match: null, created: false });
    expect(mockMatchPrisma.updateMany.mock.calls[0][0].where.status).toEqual({
      in: ['active', 'inactive'],
    });
  });

  it('rethrows non-P2002 errors without touching updateMany', async () => {
    mockMatchPrisma.create.mockRejectedValue(new Error('db down'));

    await expect(
      matchRepository.upsert({
        userAId: 'user-a',
        userBId: 'user-b',
        aToB: ['URU1'],
        bToA: ['ESP4'],
        score: 1,
      }),
    ).rejects.toThrow('db down');
    expect(mockMatchPrisma.updateMany).not.toHaveBeenCalled();
  });
});

describe('matchRepository.findById', () => {
  it('returns the match when found', async () => {
    const db = makeDbMatch();
    mockMatchPrisma.findUnique.mockResolvedValue(db);

    const result = await matchRepository.findById('match-1');
    expect(mockMatchPrisma.findUnique).toHaveBeenCalledWith({ where: { id: 'match-1' } });
    expect(result).toEqual(db);
  });

  it('returns null when not found', async () => {
    mockMatchPrisma.findUnique.mockResolvedValue(null);
    const result = await matchRepository.findById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('matchRepository.findByUsers', () => {
  it('queries by canonical user pair', async () => {
    const db = makeDbMatch();
    mockMatchPrisma.findUnique.mockResolvedValue(db);

    await matchRepository.findByUsers('user-a', 'user-b');
    expect(mockMatchPrisma.findUnique).toHaveBeenCalledWith({
      where: { userAId_userBId: { userAId: 'user-a', userBId: 'user-b' } },
    });
  });
});

describe('matchRepository.findActiveByUser', () => {
  it('returns active matches ordered by score desc', async () => {
    const matches = [makeDbMatch({ score: 5 }), makeDbMatch({ id: 'match-2', score: 2 })];
    mockMatchPrisma.findMany.mockResolvedValue(matches);

    const result = await matchRepository.findActiveByUser('user-a');

    const call = mockMatchPrisma.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('active');
    expect(call.where.OR).toEqual([{ userAId: 'user-a' }, { userBId: 'user-a' }]);
    expect(call.orderBy).toEqual({ score: 'desc' });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when user has no active matches', async () => {
    mockMatchPrisma.findMany.mockResolvedValue([]);
    const result = await matchRepository.findActiveByUser('user-x');
    expect(result).toEqual([]);
  });
});

describe('matchRepository.updateStatus', () => {
  it('updates the match status', async () => {
    const db = makeDbMatch({ status: 'completed' });
    mockMatchPrisma.update.mockResolvedValue(db);

    const result = await matchRepository.updateStatus('match-1', 'completed');
    expect(mockMatchPrisma.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: { status: 'completed' },
    });
    expect(result.status).toBe('completed');
  });
});

describe('matchRepository.findActiveByUserWithPartners', () => {
  it('returns active matches with userA and userB included', async () => {
    const partner = {
      id: 'user-b',
      email: 'b@example.com',
      username: 'userb',
      name: 'User B',
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
    };
    const matchWithPartners = {
      ...makeDbMatch(),
      userA: { ...partner, id: 'user-a', email: 'a@example.com', username: 'usera' },
      userB: partner,
    };
    mockMatchPrisma.findMany.mockResolvedValue([matchWithPartners]);

    const result = await matchRepository.findActiveByUserWithPartners('user-a');

    const call = mockMatchPrisma.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('active');
    expect(call.where.OR).toEqual([{ userAId: 'user-a' }, { userBId: 'user-a' }]);
    expect(call.include).toEqual({ userA: true, userB: true });
    expect(call.orderBy).toEqual({ score: 'desc' });
    expect(result).toHaveLength(1);
    expect(result[0].userB.username).toBe('userb');
  });

  it('returns empty array when user has no active matches', async () => {
    mockMatchPrisma.findMany.mockResolvedValue([]);
    const result = await matchRepository.findActiveByUserWithPartners('user-x');
    expect(result).toEqual([]);
  });
});

describe('matchRepository.findByIdWithPartners', () => {
  it('returns match with userA and userB when found', async () => {
    const partner = {
      id: 'user-b',
      email: 'b@example.com',
      username: 'userb',
      name: 'User B',
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
    };
    const matchWithPartners = {
      ...makeDbMatch(),
      userA: { ...partner, id: 'user-a', email: 'a@example.com', username: 'usera' },
      userB: partner,
    };
    mockMatchPrisma.findUnique.mockResolvedValue(matchWithPartners);

    const result = await matchRepository.findByIdWithPartners('match-1');

    expect(mockMatchPrisma.findUnique).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      include: { userA: true, userB: true },
    });
    expect(result).not.toBeNull();
    expect(result!.userB.username).toBe('userb');
  });

  it('returns null when match is not found', async () => {
    mockMatchPrisma.findUnique.mockResolvedValue(null);

    const result = await matchRepository.findByIdWithPartners('nonexistent');

    expect(result).toBeNull();
  });
});

describe('matchRepository.findWithLastMessageByUser', () => {
  it('queries matches with messages for the user and sorts by last message desc', async () => {
    const msg1 = {
      id: 'msg-1',
      matchId: 'match-1',
      fromUserId: 'user-a',
      body: 'Hi',
      createdAt: new Date('2026-06-01T12:00:00Z'),
      readAt: null,
    };
    const msg2 = {
      id: 'msg-2',
      matchId: 'match-2',
      fromUserId: 'user-b',
      body: 'Hey',
      createdAt: new Date('2026-06-01T11:00:00Z'),
      readAt: null,
    };
    const partner = {
      id: 'user-b',
      email: 'b@example.com',
      username: 'userb',
      name: 'B',
      avatarUrl: null,
      bio: null,
      city: null,
      neighborhood: null,
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
      reputation: 0,
      tradesCompleted: 0,
      createdAt: NOW,
      lastSeenAt: NOW,
      onboardingDoneAt: null,
    };
    // Prisma returns in DB order; our sort should reorder to newest first
    const rawMatches = [
      {
        ...makeDbMatch({ id: 'match-2' }),
        userA: { ...partner, id: 'user-a', email: 'a@example.com', username: 'usera' },
        userB: partner,
        messages: [msg2],
      },
      {
        ...makeDbMatch({ id: 'match-1' }),
        userA: { ...partner, id: 'user-a', email: 'a@example.com', username: 'usera' },
        userB: partner,
        messages: [msg1],
      },
    ];
    mockMatchPrisma.findMany.mockResolvedValue(rawMatches);

    const result = await matchRepository.findWithLastMessageByUser('user-a');

    const call = mockMatchPrisma.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual([{ userAId: 'user-a' }, { userBId: 'user-a' }]);
    expect(call.where.messages).toEqual({ some: {} });
    expect(call.include.userA).toBe(true);
    expect(call.include.userB).toBe(true);
    expect(call.include.messages).toEqual({ orderBy: { createdAt: 'desc' }, take: 1 });

    // Sorted: match-1 (12:00) before match-2 (11:00)
    expect(result[0].id).toBe('match-1');
    expect(result[1].id).toBe('match-2');
  });

  it('returns empty array when no conversations exist', async () => {
    mockMatchPrisma.findMany.mockResolvedValue([]);
    const result = await matchRepository.findWithLastMessageByUser('user-x');
    expect(result).toEqual([]);
  });

  it('uses 0 as fallback time when messages array is empty (sort stability)', async () => {
    const partner = {
      id: 'user-b',
      email: 'b@example.com',
      username: 'userb',
      name: 'B',
      avatarUrl: null,
      bio: null,
      city: null,
      neighborhood: null,
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
      reputation: 0,
      tradesCompleted: 0,
      createdAt: NOW,
      lastSeenAt: NOW,
      onboardingDoneAt: null,
    };
    const rawMatches = [
      {
        ...makeDbMatch({ id: 'match-1' }),
        userA: { ...partner, id: 'user-a', email: 'a@example.com', username: 'usera' },
        userB: partner,
        messages: [],
      },
      {
        ...makeDbMatch({ id: 'match-2' }),
        userA: { ...partner, id: 'user-a', email: 'a@example.com', username: 'usera' },
        userB: partner,
        messages: [],
      },
    ];
    mockMatchPrisma.findMany.mockResolvedValue(rawMatches);

    const result = await matchRepository.findWithLastMessageByUser('user-a');

    expect(result).toHaveLength(2);
  });
});

describe('matchRepository.markInactiveByLastSeen', () => {
  it('marks active matches inactive when a participant has not been seen since cutoff', async () => {
    const cutoff = new Date('2026-05-01T00:00:00Z');
    mockMatchPrisma.findMany.mockResolvedValue([{ id: 'match-1' }, { id: 'match-2' }]);
    mockMatchPrisma.updateMany.mockResolvedValue({ count: 2 });

    const result = await matchRepository.markInactiveByLastSeen(cutoff);

    const findCall = mockMatchPrisma.findMany.mock.calls[0][0];
    expect(findCall.where.status).toBe('active');
    expect(findCall.where.OR).toEqual([
      { userA: { lastSeenAt: { lt: cutoff } } },
      { userB: { lastSeenAt: { lt: cutoff } } },
    ]);
    expect(findCall.select).toEqual({ id: true });

    const updateCall = mockMatchPrisma.updateMany.mock.calls[0][0];
    expect(updateCall.where.id).toEqual({ in: ['match-1', 'match-2'] });
    expect(updateCall.data).toEqual({ status: 'inactive' });

    expect(result).toBe(2);
  });

  it('returns 0 and skips updateMany when no stale matches found', async () => {
    mockMatchPrisma.findMany.mockResolvedValue([]);

    const result = await matchRepository.markInactiveByLastSeen(new Date('2026-05-01T00:00:00Z'));

    expect(mockMatchPrisma.updateMany).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });
});

describe('matchRepository.findMatchmakingProfile', () => {
  function makeDbUser(overrides: object = {}) {
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
      stickers: [
        { count: 2, sticker: { number: 'URU1' } },
        { count: 1, sticker: { number: 'ARG2' } },
      ],
      ...overrides,
    };
  }

  it('returns null when the user does not exist', async () => {
    mockUserPrisma.findUnique.mockResolvedValue(null);
    const result = await matchRepository.findMatchmakingProfile('ghost');
    expect(result).toBeNull();
  });

  it('flattens stickers to { number, count } and returns the raw matchRadius', async () => {
    mockUserPrisma.findUnique.mockResolvedValue(makeDbUser());

    const result = await matchRepository.findMatchmakingProfile('user-a');

    const call = mockUserPrisma.findUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'user-a' });
    expect(call.select.stickers.where).toEqual({ count: { gte: 1 } });
    expect(result).toEqual({
      id: 'user-a',
      city: 'Montevideo',
      neighborhood: 'Pocitos',
      matchRadius: 'department',
      offerUniques: false,
      participatesInMatchmaking: true,
      isSuspended: false,
      notifyOnMatch: true,
      lastSeenAt: NOW,
      stickers: [
        { number: 'URU1', count: 2 },
        { number: 'ARG2', count: 1 },
      ],
    });
  });
});

describe('matchRepository.findCandidatePool', () => {
  function makeDbCandidate(overrides: object = {}) {
    return {
      id: 'user-b',
      city: 'Montevideo',
      neighborhood: 'Centro',
      offerUniques: false,
      participatesInMatchmaking: true,
      notifyOnMatch: true,
      lastSeenAt: NOW,
      stickers: [{ count: 3, sticker: { number: 'BRA5' } }],
      ...overrides,
    };
  }

  const cutoffDate = new Date('2026-05-08T12:00:00Z');

  it('builds the where-clause: excludes self, opt-in, not suspended, active, same city', async () => {
    mockUserPrisma.findMany.mockResolvedValue([makeDbCandidate()]);

    await matchRepository.findCandidatePool('user-a', {
      city: 'Montevideo',
      cutoffDate,
      take: 5000,
    });

    const call = mockUserPrisma.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      id: { not: 'user-a' },
      participatesInMatchmaking: true,
      isSuspended: false,
      lastSeenAt: { gt: cutoffDate },
      city: 'Montevideo',
    });
    expect(call.select.stickers.where).toEqual({ count: { gte: 1 } });
    // RF-320: LIMIT + deterministic ordering live in the query, not in JS.
    expect(call.take).toBe(5000);
    expect(call.orderBy).toEqual({ lastSeenAt: 'desc' });
  });

  it('omits the city filter when city is null (country radius)', async () => {
    mockUserPrisma.findMany.mockResolvedValue([]);

    await matchRepository.findCandidatePool('user-a', { city: null, cutoffDate, take: 5000 });

    const call = mockUserPrisma.findMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty('city');
    expect(call.where.id).toEqual({ not: 'user-a' });
  });

  it('flattens each candidate stickers to { number, count }', async () => {
    mockUserPrisma.findMany.mockResolvedValue([
      makeDbCandidate(),
      makeDbCandidate({ id: 'user-c', stickers: [] }),
    ]);

    const result = await matchRepository.findCandidatePool('user-a', {
      city: 'Montevideo',
      cutoffDate,
      take: 5000,
    });

    expect(result).toHaveLength(2);
    expect(result[0].stickers).toEqual([{ number: 'BRA5', count: 3 }]);
    expect(result[0].notifyOnMatch).toBe(true);
    expect(result[1].stickers).toEqual([]);
    expect(result[1]).not.toHaveProperty('matchRadius');
  });
});

describe('matchRepository.pruneStaleForUser', () => {
  it('marks active matches whose partner is not in freshPartnerIds as inactive', async () => {
    // user-a has active matches with user-c (stale) and user-b (fresh)
    mockMatchPrisma.findMany.mockResolvedValue([{ id: 'stale-match' }]);
    mockMatchPrisma.updateMany.mockResolvedValue({ count: 1 });

    const pruned = await matchRepository.pruneStaleForUser('user-a', ['user-b']);

    expect(mockMatchPrisma.findMany).toHaveBeenCalledOnce();
    const findCall = mockMatchPrisma.findMany.mock.calls[0][0];
    expect(findCall.where.status).toBe('active');
    // must search both sides (user can be userA or userB)
    expect(findCall.where.OR).toHaveLength(2);
    expect(findCall.where.OR[0]).toEqual({ userAId: 'user-a', userBId: { notIn: ['user-b'] } });
    expect(findCall.where.OR[1]).toEqual({ userBId: 'user-a', userAId: { notIn: ['user-b'] } });

    expect(mockMatchPrisma.updateMany).toHaveBeenCalledOnce();
    const updateCall = mockMatchPrisma.updateMany.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: { in: ['stale-match'] } });
    expect(updateCall.data).toEqual({ status: 'inactive' });

    expect(pruned).toBe(1);
  });

  it('prunes all active matches when freshPartnerIds is empty', async () => {
    mockMatchPrisma.findMany.mockResolvedValue([{ id: 'match-x' }, { id: 'match-y' }]);
    mockMatchPrisma.updateMany.mockResolvedValue({ count: 2 });

    const pruned = await matchRepository.pruneStaleForUser('user-a', []);

    const findCall = mockMatchPrisma.findMany.mock.calls[0][0];
    // When empty, every active match for this user is stale — OR without notIn restriction
    expect(findCall.where.status).toBe('active');
    expect(findCall.where.OR[0]).toEqual({ userAId: 'user-a' });
    expect(findCall.where.OR[1]).toEqual({ userBId: 'user-a' });
    expect(pruned).toBe(2);
  });

  it('returns 0 and skips updateMany when no stale matches found', async () => {
    mockMatchPrisma.findMany.mockResolvedValue([]);

    const pruned = await matchRepository.pruneStaleForUser('user-a', ['user-b']);

    expect(mockMatchPrisma.updateMany).not.toHaveBeenCalled();
    expect(pruned).toBe(0);
  });

  it('does not touch completed or trading matches (only active ones are found)', async () => {
    // Only finds active status matches — completed/trading are untouched by design
    mockMatchPrisma.findMany.mockResolvedValue([]);

    await matchRepository.pruneStaleForUser('user-a', []);

    const findCall = mockMatchPrisma.findMany.mock.calls[0][0];
    expect(findCall.where.status).toBe('active');
  });
});
