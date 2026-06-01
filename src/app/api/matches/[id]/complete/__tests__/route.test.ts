import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetMatchDetailForUser = vi.hoisted(() => vi.fn());
const mockCompleteMatch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/match.service', () => ({
  matchService: {
    getMatchDetailForUser: mockGetMatchDetailForUser,
    completeMatch: mockCompleteMatch,
  },
}));

import { PATCH } from '../route';
import type { ActiveMatchItem } from '@/lib/validations/match.schema';

const NOW_ISO = '2026-06-01T12:00:00.000Z';

function makeActiveMatchItem(overrides: Partial<ActiveMatchItem> = {}): ActiveMatchItem {
  return {
    id: 'match-1',
    score: 3,
    status: 'active',
    youGive: ['URU1', 'ARG2'],
    youGet: ['ESP4'],
    partner: {
      id: 'user-b',
      username: 'userb',
      name: 'User B',
      avatarUrl: null,
      neighborhood: 'Centro',
      city: 'Montevideo',
      reputation: 4.5,
      tradesCompleted: 2,
    },
    createdAt: NOW_ISO,
    lastUpdated: NOW_ISO,
    ...overrides,
  };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe('PATCH /api/matches/[id]/complete', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PATCH(
      new Request('http://localhost/api/matches/match-1/complete', { method: 'PATCH' }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when match not found or user is not a participant', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMatchDetailForUser.mockResolvedValue(null);

    const res = await PATCH(
      new Request('http://localhost/api/matches/nope/complete', { method: 'PATCH' }),
      makeParams('nope'),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('returns 409 when match is already completed', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMatchDetailForUser.mockResolvedValue(makeActiveMatchItem({ status: 'completed' }));

    const res = await PATCH(
      new Request('http://localhost/api/matches/match-1/complete', { method: 'PATCH' }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(409);
    expect(mockCompleteMatch).not.toHaveBeenCalled();
  });

  it('returns 409 when match is inactive', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMatchDetailForUser.mockResolvedValue(makeActiveMatchItem({ status: 'inactive' }));

    const res = await PATCH(
      new Request('http://localhost/api/matches/match-1/complete', { method: 'PATCH' }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(409);
    expect(mockCompleteMatch).not.toHaveBeenCalled();
  });

  it('returns 200 and marks match as completed', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMatchDetailForUser.mockResolvedValue(makeActiveMatchItem());
    mockCompleteMatch.mockResolvedValue(undefined);

    const res = await PATCH(
      new Request('http://localhost/api/matches/match-1/complete', { method: 'PATCH' }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockCompleteMatch).toHaveBeenCalledWith('match-1');
  });
});
