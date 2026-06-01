import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockCreateRating = vi.hoisted(() => vi.fn());
const mockGetRatingsForMatch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/rating.service', () => ({
  ratingService: {
    createRating: mockCreateRating,
    getRatingsForMatch: mockGetRatingsForMatch,
  },
  AlreadyRatedError: class AlreadyRatedError extends Error {},
  RatingMatchNotFoundError: class RatingMatchNotFoundError extends Error {},
  RatingNotCompletedError: class RatingNotCompletedError extends Error {},
}));

import { GET, POST } from '../route';

const NOW_ISO = '2026-06-01T12:00:00.000Z';

function makeSession() {
  return { userId: 'user-a', onboardingDoneAt: new Date() };
}

function makeRatingItem(overrides = {}) {
  return {
    id: 'rating-1',
    matchId: 'match-1',
    raterId: 'user-a',
    ratedId: 'user-b',
    stars: 4,
    comment: null,
    createdAt: NOW_ISO,
    ...overrides,
  };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/matches/[id]/ratings', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(
      new Request('http://localhost/api/matches/match-1/ratings'),
      makeParams('match-1'),
    );

    expect(res.status).toBe(401);
  });

  it('returns 200 with ratings and hasRated', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetRatingsForMatch.mockResolvedValue({ ratings: [makeRatingItem()], hasRated: true });

    const res = await GET(
      new Request('http://localhost/api/matches/match-1/ratings'),
      makeParams('match-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasRated).toBe(true);
    expect(body.ratings).toHaveLength(1);
  });

  it('returns 404 when match not found or not participant', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const { RatingMatchNotFoundError } = await import('@/services/rating.service');
    mockGetRatingsForMatch.mockRejectedValue(new RatingMatchNotFoundError());

    const res = await GET(
      new Request('http://localhost/api/matches/nope/ratings'),
      makeParams('nope'),
    );

    expect(res.status).toBe(404);
  });

  it('rethrows unexpected errors', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetRatingsForMatch.mockRejectedValue(new Error('DB connection failed'));

    await expect(
      GET(new Request('http://localhost/api/matches/match-1/ratings'), makeParams('match-1')),
    ).rejects.toThrow('DB connection failed');
  });
});

describe('POST /api/matches/[id]/ratings', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/ratings', {
        method: 'POST',
        body: JSON.stringify({ stars: 4 }),
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid input (stars out of range)', async () => {
    mockGetSession.mockResolvedValue(makeSession());

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/ratings', {
        method: 'POST',
        body: JSON.stringify({ stars: 6 }),
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing stars', async () => {
    mockGetSession.mockResolvedValue(makeSession());

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/ratings', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(400);
  });

  it('returns 201 with created rating', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockCreateRating.mockResolvedValue(makeRatingItem());

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/ratings', {
        method: 'POST',
        body: JSON.stringify({ stars: 4 }),
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rating.stars).toBe(4);
    expect(mockCreateRating).toHaveBeenCalledWith('match-1', 'user-a', 4, undefined);
  });

  it('returns 404 when match not found or not participant', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const { RatingMatchNotFoundError } = await import('@/services/rating.service');
    mockCreateRating.mockRejectedValue(new RatingMatchNotFoundError());

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/ratings', {
        method: 'POST',
        body: JSON.stringify({ stars: 4 }),
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(404);
  });

  it('returns 409 when match is not completed', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const { RatingNotCompletedError } = await import('@/services/rating.service');
    mockCreateRating.mockRejectedValue(new RatingNotCompletedError());

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/ratings', {
        method: 'POST',
        body: JSON.stringify({ stars: 4 }),
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Match not completed');
  });

  it('returns 409 when user already rated', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const { AlreadyRatedError } = await import('@/services/rating.service');
    mockCreateRating.mockRejectedValue(new AlreadyRatedError());

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/ratings', {
        method: 'POST',
        body: JSON.stringify({ stars: 5 }),
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Already rated');
  });

  it('rethrows unexpected errors', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockCreateRating.mockRejectedValue(new Error('Unexpected failure'));

    await expect(
      POST(
        new Request('http://localhost/api/matches/match-1/ratings', {
          method: 'POST',
          body: JSON.stringify({ stars: 4 }),
        }),
        makeParams('match-1'),
      ),
    ).rejects.toThrow('Unexpected failure');
  });
});
