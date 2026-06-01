import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetNotificationsForUser = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/notification.service', () => ({
  notificationService: {
    getNotificationsForUser: mockGetNotificationsForUser,
  },
}));

import { GET } from '../route';

const NOW_ISO = '2026-06-01T12:00:00.000Z';

function makeNotificationItem(overrides: object = {}) {
  return {
    id: 'notif-1',
    type: 'new_match',
    payload: { matchId: 'match-1' },
    readAt: null,
    createdAt: NOW_ISO,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/notifications', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/notifications'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when page param is invalid', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });

    const res = await GET(new Request('http://localhost/api/notifications?page=0'));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Bad request');
  });

  it('returns 200 with notifications using defaults when no query params', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetNotificationsForUser.mockResolvedValue({
      notifications: [makeNotificationItem()],
      total: 1,
      unreadCount: 1,
    });

    const res = await GET(new Request('http://localhost/api/notifications'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.unreadCount).toBe(1);
    expect(mockGetNotificationsForUser).toHaveBeenCalledWith('user-a', 1, 20);
  });

  it('passes custom page and limit to the service', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetNotificationsForUser.mockResolvedValue({
      notifications: [],
      total: 0,
      unreadCount: 0,
    });

    const res = await GET(new Request('http://localhost/api/notifications?page=2&limit=10'));

    expect(res.status).toBe(200);
    expect(mockGetNotificationsForUser).toHaveBeenCalledWith('user-a', 2, 10);
  });
});
