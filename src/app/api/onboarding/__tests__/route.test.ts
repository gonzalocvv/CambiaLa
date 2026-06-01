import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockCompleteOnboarding = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: { completeOnboarding: mockCompleteOnboarding },
  UsernameConflictError: class UsernameConflictError extends Error {
    constructor() {
      super('USERNAME_TAKEN');
      this.name = 'UsernameConflictError';
    }
  },
}));

import { POST } from '../route';

const SESSION = { userId: 'user-1', onboardingDoneAt: null };
const VALID_BODY = { username: 'gonza', city: 'Montevideo', neighborhood: 'Pocitos' };

beforeEach(() => vi.clearAllMocks());

describe('POST /api/onboarding', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({ username: 'x', city: 'NoExiste' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 409 when username is taken', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const { UsernameConflictError } = await import('@/services/user.service');
    mockCompleteOnboarding.mockRejectedValue(new UsernameConflictError());
    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('USERNAME_TAKEN');
  });

  it('returns 200 on success', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCompleteOnboarding.mockResolvedValue(undefined);
    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(VALID_BODY),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockCompleteOnboarding).toHaveBeenCalledWith('user-1', VALID_BODY);
  });

  it('returns 200 without neighborhood for non-Montevideo city', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCompleteOnboarding.mockResolvedValue(undefined);
    const body = { username: 'gonza', city: 'Salto' };
    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockCompleteOnboarding).toHaveBeenCalledWith('user-1', body);
  });

  it('returns 400 when city is Montevideo but neighborhood is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({ username: 'gonza', city: 'Montevideo' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is not valid JSON', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('rethrows unexpected errors', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCompleteOnboarding.mockRejectedValue(new Error('DB down'));
    await expect(
      POST(
        new Request('http://localhost/api/onboarding', {
          method: 'POST',
          body: JSON.stringify(VALID_BODY),
        }),
      ),
    ).rejects.toThrow('DB down');
  });
});
