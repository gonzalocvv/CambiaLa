import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockMarkNotificationRead = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/notification.service', () => ({
  notificationService: {
    markNotificationRead: mockMarkNotificationRead,
  },
}));

import { PATCH } from '../route';

const NOW_ISO = '2026-06-01T12:00:00.000Z';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe('PATCH /api/notifications/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PATCH(
      new Request('http://localhost/api/notifications/notif-1', { method: 'PATCH' }),
      makeParams('notif-1'),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when notification not found or belongs to another user', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockMarkNotificationRead.mockResolvedValue(null);

    const res = await PATCH(
      new Request('http://localhost/api/notifications/notif-x', { method: 'PATCH' }),
      makeParams('notif-x'),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('returns 200 when notification is marked as read', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockMarkNotificationRead.mockResolvedValue({
      id: 'notif-1',
      type: 'new_match',
      payload: { matchId: 'match-1' },
      readAt: NOW_ISO,
      createdAt: NOW_ISO,
    });

    const res = await PATCH(
      new Request('http://localhost/api/notifications/notif-1', { method: 'PATCH' }),
      makeParams('notif-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockMarkNotificationRead).toHaveBeenCalledWith('notif-1', 'user-a');
  });
});
