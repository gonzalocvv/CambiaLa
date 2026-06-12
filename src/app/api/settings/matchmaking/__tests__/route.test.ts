import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockUpdateMatchmaking = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: { updateMatchmaking: mockUpdateMatchmaking },
  UserNotFoundError: class UserNotFoundError extends Error {
    constructor() {
      super('USER_NOT_FOUND');
      this.name = 'UserNotFoundError';
    }
  },
}));

import { PUT } from '../route';

beforeEach(() => vi.clearAllMocks());

describe('PUT /api/settings/matchmaking', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PUT(
      new Request('http://localhost/api/settings/matchmaking', {
        method: 'PUT',
        body: '{}',
      }),
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when body is malformed JSON', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings/matchmaking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'bad-json',
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when matchRadius is invalid', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings/matchmaking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchRadius: 'city' }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 200 and calls updateMatchmaking with participatesInMatchmaking=false', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });
    mockUpdateMatchmaking.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings/matchmaking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participatesInMatchmaking: false }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockUpdateMatchmaking).toHaveBeenCalledWith('u1', {
      participatesInMatchmaking: false,
    });
  });

  it('returns 200 with valid matchRadius=neighborhood', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });
    mockUpdateMatchmaking.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings/matchmaking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchRadius: 'neighborhood' }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockUpdateMatchmaking).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ matchRadius: 'neighborhood' }),
    );
  });

  it('accepts all four fields at once', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });
    mockUpdateMatchmaking.mockResolvedValue(undefined);

    const payload = {
      participatesInMatchmaking: true,
      matchRadius: 'country',
      offerUniques: true,
      acceptUnbalanced: false,
    };

    const res = await PUT(
      new Request('http://localhost/api/settings/matchmaking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockUpdateMatchmaking).toHaveBeenCalledWith('u1', payload);
  });

  it('returns 404 when user not found', async () => {
    const { UserNotFoundError } = await import('@/services/user.service');
    mockGetSession.mockResolvedValue({ userId: 'nonexistent', onboardingDoneAt: new Date() });
    mockUpdateMatchmaking.mockRejectedValue(new UserNotFoundError());

    const res = await PUT(
      new Request('http://localhost/api/settings/matchmaking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participatesInMatchmaking: true }),
      }),
    );

    expect(res.status).toBe(404);
  });
});
