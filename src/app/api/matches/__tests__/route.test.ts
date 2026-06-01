import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetActiveMatchesWithPartners = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/match.service', () => ({
  matchService: { getActiveMatchesWithPartners: mockGetActiveMatchesWithPartners },
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

beforeEach(() => vi.clearAllMocks());

describe('GET /api/matches', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns active matches for the authenticated user', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a' });
    mockGetActiveMatchesWithPartners.mockResolvedValue([makeActiveMatchItem()]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].score).toBe(3);
    expect(body.matches[0].partner.username).toBe('userb');
    expect(mockGetActiveMatchesWithPartners).toHaveBeenCalledWith('user-a');
  });

  it('returns empty matches array when user has no active matches', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-x' });
    mockGetActiveMatchesWithPartners.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matches).toEqual([]);
  });

  it('returns matches sorted by score desc (delegated to service)', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a' });
    mockGetActiveMatchesWithPartners.mockResolvedValue([
      makeActiveMatchItem({ id: 'match-1', score: 5 }),
      makeActiveMatchItem({ id: 'match-2', score: 2 }),
    ]);

    const res = await GET();
    const body = await res.json();

    expect(body.matches[0].score).toBe(5);
    expect(body.matches[1].score).toBe(2);
  });
});
