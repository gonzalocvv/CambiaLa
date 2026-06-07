import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetDetail = vi.hoisted(() => vi.fn());
const mockToggle = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: { getUserDetailForAdmin: mockGetDetail, toggleSuspension: mockToggle },
  UserNotFoundError: class UserNotFoundError extends Error {
    constructor() {
      super('USER_NOT_FOUND');
      this.name = 'UserNotFoundError';
    }
  },
}));

import { GET, PATCH } from '../route';

const adminSession = { userId: 'admin-1', onboardingDoneAt: new Date(), role: 'admin' };
const userSession = { userId: 'user-1', onboardingDoneAt: new Date(), role: 'user' };

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/admin/users/u1'), makeCtx('u1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when role is not admin', async () => {
    mockGetSession.mockResolvedValue(userSession);
    const res = await GET(new Request('http://localhost/api/admin/users/u1'), makeCtx('u1'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with user detail for admin', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockGetDetail.mockResolvedValue({ id: 'u1', email: 'a@test.com' });

    const res = await GET(new Request('http://localhost/api/admin/users/u1'), makeCtx('u1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe('u1');
  });

  it('returns 404 when user not found', async () => {
    const { UserNotFoundError } = await import('@/services/user.service');
    mockGetSession.mockResolvedValue(adminSession);
    mockGetDetail.mockRejectedValue(new UserNotFoundError());

    const res = await GET(new Request('http://localhost/api/admin/users/nope'), makeCtx('nope'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u1', { method: 'PATCH', body: '{}' }),
      makeCtx('u1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when role is not admin', async () => {
    mockGetSession.mockResolvedValue(userSession);
    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u1', {
        method: 'PATCH',
        body: JSON.stringify({ isSuspended: true }),
      }),
      makeCtx('u1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when body is malformed', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u1', { method: 'PATCH', body: 'bad' }),
      makeCtx('u1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when isSuspended is missing', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      makeCtx('u1'),
    );
    expect(res.status).toBe(400);
  });

  it('suspends user and returns 200', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockToggle.mockResolvedValue({ id: 'u1', isSuspended: true });

    const res = await PATCH(
      new Request('http://localhost/api/admin/users/u1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: true }),
      }),
      makeCtx('u1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isSuspended).toBe(true);
    expect(mockToggle).toHaveBeenCalledWith('u1', true);
  });

  it('returns 404 when user not found', async () => {
    const { UserNotFoundError } = await import('@/services/user.service');
    mockGetSession.mockResolvedValue(adminSession);
    mockToggle.mockRejectedValue(new UserNotFoundError());

    const res = await PATCH(
      new Request('http://localhost/api/admin/users/nope', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: true }),
      }),
      makeCtx('nope'),
    );
    expect(res.status).toBe(404);
  });
});
