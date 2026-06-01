import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetMatchDetailForUser = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/match.service', () => ({
  matchService: { getMatchDetailForUser: mockGetMatchDetailForUser },
}));

import { GET } from '../route';
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
      bio: null,
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

describe('GET /api/matches/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(
      new Request('http://localhost/api/matches/match-1'),
      makeParams('match-1'),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 with match detail when found', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMatchDetailForUser.mockResolvedValue(makeActiveMatchItem());

    const res = await GET(
      new Request('http://localhost/api/matches/match-1'),
      makeParams('match-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.match.id).toBe('match-1');
    expect(body.match.score).toBe(3);
    expect(body.match.youGive).toEqual(['URU1', 'ARG2']);
    expect(body.match.youGet).toEqual(['ESP4']);
    expect(mockGetMatchDetailForUser).toHaveBeenCalledWith('match-1', 'user-a');
  });

  it('returns 404 when match not found or user is not a participant', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMatchDetailForUser.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/matches/nope'), makeParams('nope'));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });
});
