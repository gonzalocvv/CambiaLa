import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockListForDepartment = vi.hoisted(() => vi.fn());
const mockGetUserProfile = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/activity.service', () => ({
  activityService: { listForDepartment: mockListForDepartment },
}));
vi.mock('@/services/user.service', () => ({
  userService: { getUserProfile: mockGetUserProfile },
}));

import { GET } from '../route';

const userSession = { userId: 'user-1', onboardingDoneAt: new Date(), role: 'user' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserProfile.mockResolvedValue({ id: 'user-1', city: 'Rocha' });
  mockListForDepartment.mockResolvedValue({ activities: [], total: 0, department: 'Rocha' });
});

describe('GET /api/activities', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/activities'));
    expect(res.status).toBe(401);
  });

  it('defaults to the user city when no department filter is given', async () => {
    mockGetSession.mockResolvedValue(userSession);
    const res = await GET(new Request('http://localhost/api/activities'));
    expect(res.status).toBe(200);
    expect(mockListForDepartment).toHaveBeenCalledWith('Rocha', { page: 1, pageSize: 20 });
  });

  it('passes the department filter when provided', async () => {
    mockGetSession.mockResolvedValue(userSession);
    await GET(new Request('http://localhost/api/activities?department=Maldonado'));
    expect(mockListForDepartment).toHaveBeenCalledWith('Rocha', {
      department: 'Maldonado',
      page: 1,
      pageSize: 20,
    });
  });

  it('returns 400 for an invalid department', async () => {
    mockGetSession.mockResolvedValue(userSession);
    const res = await GET(new Request('http://localhost/api/activities?department=Narnia'));
    expect(res.status).toBe(400);
  });
});
