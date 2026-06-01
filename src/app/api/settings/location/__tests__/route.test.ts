import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockUpdateLocation = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: {
    updateLocation: mockUpdateLocation,
  },
  UserNotFoundError: class UserNotFoundError extends Error {
    constructor() {
      super('USER_NOT_FOUND');
      this.name = 'UserNotFoundError';
    }
  },
}));

import { PUT } from '../route';

beforeEach(() => vi.clearAllMocks());

describe('PUT /api/settings/location', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PUT(
      new Request('http://localhost/api/settings/location', { method: 'PUT', body: '{}' }),
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when city is not a valid department', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Buenos Aires' }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when Montevideo without neighborhood', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Montevideo' }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 200 for non-Montevideo department', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockUpdateLocation.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Salto' }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockUpdateLocation).toHaveBeenCalledWith('cuid-user-1', { city: 'Salto' });
  });

  it('returns 200 for Montevideo with neighborhood', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockUpdateLocation.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Montevideo', neighborhood: 'Pocitos' }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockUpdateLocation).toHaveBeenCalledWith('cuid-user-1', {
      city: 'Montevideo',
      neighborhood: 'Pocitos',
    });
  });

  it('returns 404 when user not found', async () => {
    const { UserNotFoundError } = await import('@/services/user.service');
    mockGetSession.mockResolvedValue({ userId: 'nonexistent', onboardingDoneAt: new Date() });
    mockUpdateLocation.mockRejectedValue(new UserNotFoundError());

    const res = await PUT(
      new Request('http://localhost/api/settings/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Salto' }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it('rethrows unexpected errors', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockUpdateLocation.mockRejectedValue(new Error('db error'));

    await expect(
      PUT(
        new Request('http://localhost/api/settings/location', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: 'Salto' }),
        }),
      ),
    ).rejects.toThrow('db error');
  });
});
