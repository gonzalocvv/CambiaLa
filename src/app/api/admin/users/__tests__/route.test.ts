import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockListUsers = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: { listUsersForAdmin: mockListUsers },
}));

import { GET } from '../route';

const adminSession = { userId: 'admin-1', onboardingDoneAt: new Date(), role: 'admin' };
const userSession = { userId: 'user-1', onboardingDoneAt: new Date(), role: 'user' };

beforeEach(() => vi.clearAllMocks());

describe('GET /api/admin/users', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/admin/users'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when role is not admin', async () => {
    mockGetSession.mockResolvedValue(userSession);
    const res = await GET(new Request('http://localhost/api/admin/users'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with user list for admin', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockListUsers.mockResolvedValue({ users: [{ id: 'u1' }], total: 1 });

    const res = await GET(new Request('http://localhost/api/admin/users'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('passes search and pagination params', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockListUsers.mockResolvedValue({ users: [], total: 0 });

    await GET(new Request('http://localhost/api/admin/users?search=gonza&page=2&pageSize=10'));
    expect(mockListUsers).toHaveBeenCalledWith({ search: 'gonza', page: 2, pageSize: 10 });
  });

  it('returns 400 for invalid page param', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await GET(new Request('http://localhost/api/admin/users?page=0'));
    expect(res.status).toBe(400);
  });
});
