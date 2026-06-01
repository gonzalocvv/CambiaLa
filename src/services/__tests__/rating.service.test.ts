import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMatchRepository = vi.hoisted(() => ({
  findById: vi.fn(),
}));

const mockRatingRepository = vi.hoisted(() => ({
  create: vi.fn(),
  findByMatch: vi.fn(),
  findByRater: vi.fn(),
  getReputationStats: vi.fn(),
}));

const mockUserRepository = vi.hoisted(() => ({
  updateReputation: vi.fn(),
}));

vi.mock('@/repositories/match.repository', () => ({ matchRepository: mockMatchRepository }));
vi.mock('@/repositories/rating.repository', () => ({ ratingRepository: mockRatingRepository }));
vi.mock('@/repositories/user.repository', () => ({ userRepository: mockUserRepository }));

import {
  AlreadyRatedError,
  RatingMatchNotFoundError,
  RatingNotCompletedError,
  ratingService,
} from '../rating.service';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeMatch(overrides = {}) {
  return {
    id: 'match-1',
    userAId: 'user-a',
    userBId: 'user-b',
    aToB: ['URU1'],
    bToA: ['ARG2'],
    score: 1,
    status: 'completed',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeRating(overrides = {}) {
  return {
    id: 'rating-1',
    matchId: 'match-1',
    raterId: 'user-a',
    ratedId: 'user-b',
    stars: 4,
    comment: null,
    createdAt: NOW,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('ratingService.createRating', () => {
  it('creates a rating for user-a rating user-b', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch());
    mockRatingRepository.findByRater.mockResolvedValue(null);
    mockRatingRepository.create.mockResolvedValue(makeRating());
    mockRatingRepository.getReputationStats.mockResolvedValue({ avg: 4, count: 1 });
    mockUserRepository.updateReputation.mockResolvedValue({
      id: 'user-b',
      reputation: 4,
      tradesCompleted: 1,
    });

    const result = await ratingService.createRating('match-1', 'user-a', 4);

    expect(mockRatingRepository.create).toHaveBeenCalledWith(
      'match-1',
      'user-a',
      'user-b',
      4,
      undefined,
    );
    expect(mockUserRepository.updateReputation).toHaveBeenCalledWith('user-b', {
      reputation: 4,
      tradesCompleted: 1,
    });
    expect(result.ratedId).toBe('user-b');
  });

  it('creates a rating for user-b rating user-a', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch());
    mockRatingRepository.findByRater.mockResolvedValue(null);
    mockRatingRepository.create.mockResolvedValue(
      makeRating({ raterId: 'user-b', ratedId: 'user-a' }),
    );
    mockRatingRepository.getReputationStats.mockResolvedValue({ avg: 4, count: 1 });
    mockUserRepository.updateReputation.mockResolvedValue({
      id: 'user-a',
      reputation: 4,
      tradesCompleted: 1,
    });

    const result = await ratingService.createRating('match-1', 'user-b', 4);

    expect(mockRatingRepository.create).toHaveBeenCalledWith(
      'match-1',
      'user-b',
      'user-a',
      4,
      undefined,
    );
    expect(result.ratedId).toBe('user-a');
  });

  it('passes comment when provided', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch());
    mockRatingRepository.findByRater.mockResolvedValue(null);
    mockRatingRepository.create.mockResolvedValue(makeRating({ comment: 'Excelente!' }));
    mockRatingRepository.getReputationStats.mockResolvedValue({ avg: 5, count: 1 });
    mockUserRepository.updateReputation.mockResolvedValue({
      id: 'user-b',
      reputation: 5,
      tradesCompleted: 1,
    });

    await ratingService.createRating('match-1', 'user-a', 5, 'Excelente!');

    expect(mockRatingRepository.create).toHaveBeenCalledWith(
      'match-1',
      'user-a',
      'user-b',
      5,
      'Excelente!',
    );
  });

  it('throws RatingMatchNotFoundError when match does not exist', async () => {
    mockMatchRepository.findById.mockResolvedValue(null);

    await expect(ratingService.createRating('nope', 'user-a', 5)).rejects.toBeInstanceOf(
      RatingMatchNotFoundError,
    );
  });

  it('throws RatingMatchNotFoundError when user is not a participant', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch());

    await expect(ratingService.createRating('match-1', 'user-c', 5)).rejects.toBeInstanceOf(
      RatingMatchNotFoundError,
    );
  });

  it('throws RatingNotCompletedError when match is not completed', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch({ status: 'active' }));

    await expect(ratingService.createRating('match-1', 'user-a', 5)).rejects.toBeInstanceOf(
      RatingNotCompletedError,
    );
  });

  it('throws AlreadyRatedError when user already rated', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch());
    mockRatingRepository.findByRater.mockResolvedValue(makeRating());

    await expect(ratingService.createRating('match-1', 'user-a', 5)).rejects.toBeInstanceOf(
      AlreadyRatedError,
    );
  });
});

describe('ratingService.getRatingsForMatch', () => {
  it('returns ratings and hasRated=false when user has not rated', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch());
    mockRatingRepository.findByMatch.mockResolvedValue([]);
    mockRatingRepository.findByRater.mockResolvedValue(null);

    const result = await ratingService.getRatingsForMatch('match-1', 'user-a');

    expect(result.ratings).toHaveLength(0);
    expect(result.hasRated).toBe(false);
  });

  it('returns hasRated=true when user already rated', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch());
    mockRatingRepository.findByMatch.mockResolvedValue([makeRating()]);
    mockRatingRepository.findByRater.mockResolvedValue(makeRating());

    const result = await ratingService.getRatingsForMatch('match-1', 'user-a');

    expect(result.hasRated).toBe(true);
    expect(result.ratings).toHaveLength(1);
  });

  it('throws RatingMatchNotFoundError when match does not exist', async () => {
    mockMatchRepository.findById.mockResolvedValue(null);

    await expect(ratingService.getRatingsForMatch('nope', 'user-a')).rejects.toBeInstanceOf(
      RatingMatchNotFoundError,
    );
  });

  it('throws RatingMatchNotFoundError when user is not a participant', async () => {
    mockMatchRepository.findById.mockResolvedValue(makeMatch());

    await expect(ratingService.getRatingsForMatch('match-1', 'user-c')).rejects.toBeInstanceOf(
      RatingMatchNotFoundError,
    );
  });
});
