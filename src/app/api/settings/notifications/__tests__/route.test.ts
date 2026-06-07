import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockUpdateNotifications = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: { updateNotifications: mockUpdateNotifications },
  UserNotFoundError: class UserNotFoundError extends Error {
    constructor() {
      super('USER_NOT_FOUND');
      this.name = 'UserNotFoundError';
    }
  },
}));

import { PUT } from '../route';

beforeEach(() => vi.clearAllMocks());

describe('PUT /api/settings/notifications', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PUT(
      new Request('http://localhost/api/settings/notifications', {
        method: 'PUT',
        body: '{}',
      }),
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when body is malformed JSON', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when emailFrequency is invalid', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailFrequency: 'monthly' }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 200 and calls updateNotifications with valid notifyOnMatch', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });
    mockUpdateNotifications.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOnMatch: false }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockUpdateNotifications).toHaveBeenCalledWith('u1', { notifyOnMatch: false });
  });

  it('returns 200 with emailFrequency=weekly', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1', onboardingDoneAt: new Date() });
    mockUpdateNotifications.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailFrequency: 'weekly' }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockUpdateNotifications).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ emailFrequency: 'weekly' }),
    );
  });

  it('returns 404 when user not found', async () => {
    const { UserNotFoundError } = await import('@/services/user.service');
    mockGetSession.mockResolvedValue({ userId: 'nonexistent', onboardingDoneAt: new Date() });
    mockUpdateNotifications.mockRejectedValue(new UserNotFoundError());

    const res = await PUT(
      new Request('http://localhost/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOnMatch: true }),
      }),
    );

    expect(res.status).toBe(404);
  });
});
