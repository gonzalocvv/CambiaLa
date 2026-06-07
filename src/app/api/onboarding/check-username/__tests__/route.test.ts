import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockCheckUsername = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn(() => ({ allowed: true, remaining: 19 })));

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: { checkUsernameAvailability: mockCheckUsername },
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { GET } from '../route';

const SESSION = { userId: 'user-1', onboardingDoneAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 19 });
});

describe('GET /api/onboarding/check-username — rate limit', () => {
  it('429 cuando se excede el rate limit', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 });

    const res = await GET(
      new Request('http://localhost/api/onboarding/check-username?username=gonza'),
    );

    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('rate_limited');
    expect(mockCheckUsername).not.toHaveBeenCalled();
  });
});

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
