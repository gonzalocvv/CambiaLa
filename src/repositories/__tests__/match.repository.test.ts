import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMatchPrisma = vi.hoisted(() => ({
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

import { matchRepository } from '../match.repository';

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

beforeEach(() => vi.clearAllMocks());

describe('matchRepository.upsert', () => {
  it('creates a new match with status active', async () => {
    const db = makeDbMatch();
    mockMatchPrisma.upsert.mockResolvedValue(db);

    const result = await matchRepository.upsert({
      userAId: 'user-a',
      userBId: 'user-b',
      aToB: ['URU1', 'ARG2', 'BRA3'],
      bToA: ['ESP4', 'FRA5', 'GER6'],
      score: 3,
    });

    expect(mockMatchPrisma.upsert).toHaveBeenCalledOnce();
    const call = mockMatchPrisma.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      userAId_userBId: { userAId: 'user-a', userBId: 'user-b' },
    });
    expect(call.create.status).toBe('active');
    expect(call.create.score).toBe(3);
    expect(result).toEqual(db);
  });

  it('reactivates a match on update', async () => {
    const db = makeDbMatch({ score: 5 });
    mockMatchPrisma.upsert.mockResolvedValue(db);

    await matchRepository.upsert({
      userAId: 'user-a',
      userBId: 'user-b',
      aToB: ['URU1'],
      bToA: ['ESP4'],
      score: 5,
    });

    const call = mockMatchPrisma.upsert.mock.calls[0][0];
    expect(call.update.status).toBe('active');
    expect(call.update.score).toBe(5);
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
      lastSeenAt: NOW,
      stickers: [{ count: 3, sticker: { number: 'BRA5' } }],
      ...overrides,
    };
  }

  const cutoffDate = new Date('2026-05-08T12:00:00Z');

  it('builds the where-clause: excludes self, opt-in, not suspended, active, same city', async () => {
    mockUserPrisma.findMany.mockResolvedValue([makeDbCandidate()]);

    await matchRepository.findCandidatePool('user-a', { city: 'Montevideo', cutoffDate });

    const call = mockUserPrisma.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      id: { not: 'user-a' },
      participatesInMatchmaking: true,
      isSuspended: false,
      lastSeenAt: { gt: cutoffDate },
      city: 'Montevideo',
    });
    expect(call.select.stickers.where).toEqual({ count: { gte: 1 } });
  });

  it('omits the city filter when city is null (country radius)', async () => {
    mockUserPrisma.findMany.mockResolvedValue([]);

    await matchRepository.findCandidatePool('user-a', { city: null, cutoffDate });

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
    });

    expect(result).toHaveLength(2);
    expect(result[0].stickers).toEqual([{ number: 'BRA5', count: 3 }]);
    expect(result[1].stickers).toEqual([]);
    expect(result[1]).not.toHaveProperty('matchRadius');
  });
});
