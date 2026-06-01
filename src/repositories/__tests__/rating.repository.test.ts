import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  rating: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { ratingRepository } from '../rating.repository';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeRating(overrides = {}) {
  return {
    id: 'rating-1',
    matchId: 'match-1',
    raterId: 'user-a',
    ratedId: 'user-b',
    stars: 4,
    comment: 'Muy buen cambio',
    createdAt: NOW,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('ratingRepository.create', () => {
  it('creates a rating with all fields', async () => {
    const rating = makeRating();
    mockPrisma.rating.create.mockResolvedValue(rating);

    const result = await ratingRepository.create(
      'match-1',
      'user-a',
      'user-b',
      4,
      'Muy buen cambio',
    );

    expect(mockPrisma.rating.create).toHaveBeenCalledWith({
      data: {
        matchId: 'match-1',
        raterId: 'user-a',
        ratedId: 'user-b',
        stars: 4,
        comment: 'Muy buen cambio',
      },
    });
    expect(result.id).toBe('rating-1');
  });

  it('creates a rating without comment', async () => {
    const rating = makeRating({ comment: null });
    mockPrisma.rating.create.mockResolvedValue(rating);

    await ratingRepository.create('match-1', 'user-a', 'user-b', 5);

    expect(mockPrisma.rating.create).toHaveBeenCalledWith({
      data: { matchId: 'match-1', raterId: 'user-a', ratedId: 'user-b', stars: 5, comment: null },
    });
  });
});

describe('ratingRepository.findByMatch', () => {
  it('returns ratings for a match ordered by createdAt asc', async () => {
    const ratings = [
      makeRating(),
      makeRating({ id: 'rating-2', raterId: 'user-b', ratedId: 'user-a', stars: 5 }),
    ];
    mockPrisma.rating.findMany.mockResolvedValue(ratings);

    const result = await ratingRepository.findByMatch('match-1');

    expect(mockPrisma.rating.findMany).toHaveBeenCalledWith({
      where: { matchId: 'match-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no ratings', async () => {
    mockPrisma.rating.findMany.mockResolvedValue([]);

    const result = await ratingRepository.findByMatch('match-empty');

    expect(result).toHaveLength(0);
  });
});

describe('ratingRepository.findByRater', () => {
  it('returns the rating when it exists', async () => {
    const rating = makeRating();
    mockPrisma.rating.findUnique.mockResolvedValue(rating);

    const result = await ratingRepository.findByRater('match-1', 'user-a');

    expect(mockPrisma.rating.findUnique).toHaveBeenCalledWith({
      where: { matchId_raterId: { matchId: 'match-1', raterId: 'user-a' } },
    });
    expect(result?.id).toBe('rating-1');
  });

  it('returns null when the user has not rated', async () => {
    mockPrisma.rating.findUnique.mockResolvedValue(null);

    const result = await ratingRepository.findByRater('match-1', 'user-a');

    expect(result).toBeNull();
  });
});

describe('ratingRepository.getReputationStats', () => {
  it('returns avg and count from aggregate', async () => {
    mockPrisma.rating.aggregate.mockResolvedValue({
      _avg: { stars: 4.2 },
      _count: { stars: 5 },
    });

    const result = await ratingRepository.getReputationStats('user-b');

    expect(mockPrisma.rating.aggregate).toHaveBeenCalledWith({
      where: { ratedId: 'user-b' },
      _avg: { stars: true },
      _count: { stars: true },
    });
    expect(result.avg).toBeCloseTo(4.2);
    expect(result.count).toBe(5);
  });

  it('returns 0 avg and 0 count when no ratings exist', async () => {
    mockPrisma.rating.aggregate.mockResolvedValue({
      _avg: { stars: null },
      _count: { stars: 0 },
    });

    const result = await ratingRepository.getReputationStats('user-new');

    expect(result.avg).toBe(0);
    expect(result.count).toBe(0);
  });
});
