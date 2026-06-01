import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockCheckUsername = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: { checkUsernameAvailability: mockCheckUsername },
}));

import { GET } from '../route';

const SESSION = { userId: 'user-1', onboardingDoneAt: null };

beforeEach(() => vi.clearAllMocks());

describe('GET /api/onboarding/check-username', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(
      new Request('http://localhost/api/onboarding/check-username?username=gonza'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when username param is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await GET(new Request('http://localhost/api/onboarding/check-username'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when username is too short', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await GET(
      new Request('http://localhost/api/onboarding/check-username?username=ab'),
    );
    expect(res.status).toBe(400);
  });

  it('returns available: true when username is free', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCheckUsername.mockResolvedValue(true);
    const res = await GET(
      new Request('http://localhost/api/onboarding/check-username?username=gonza'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(mockCheckUsername).toHaveBeenCalledWith('gonza');
  });

  it('returns available: false when username is taken', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCheckUsername.mockResolvedValue(false);
    const res = await GET(
      new Request('http://localhost/api/onboarding/check-username?username=taken'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
  });
});
