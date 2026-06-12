import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockDeleteAccount = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
const mockAdminDeleteUser = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));

vi.mock('@/services/user.service', () => ({
  userService: { deleteAccount: mockDeleteAccount },
  UserNotFoundError: class UserNotFoundError extends Error {
    constructor() {
      super('USER_NOT_FOUND');
      this.name = 'UserNotFoundError';
    }
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser, signOut: mockSignOut },
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { admin: { deleteUser: mockAdminDeleteUser } },
  }),
}));

import { DELETE } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  mockSignOut.mockResolvedValue({});
  mockAdminDeleteUser.mockResolvedValue({});
  mockGetUser.mockResolvedValue({ data: { user: { id: 'supabase-uuid-1' } } });
});

describe('DELETE /api/settings/account', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await DELETE();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('returns 200 and deletes account when authenticated', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockDeleteAccount.mockResolvedValue(undefined);

    const res = await DELETE();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockDeleteAccount).toHaveBeenCalledWith('cuid-user-1');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('returns 404 when user not found in DB', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    const { UserNotFoundError } = await import('@/services/user.service');
    mockDeleteAccount.mockRejectedValue(new UserNotFoundError());

    const res = await DELETE();

    expect(res.status).toBe(404);
  });

  it('returns 500 on unexpected error', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockDeleteAccount.mockRejectedValue(new Error('DB error'));

    const res = await DELETE();

    expect(res.status).toBe(500);
  });

  it('still returns 200 when admin supabase delete fails (best-effort)', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockDeleteAccount.mockResolvedValue(undefined);
    mockAdminDeleteUser.mockRejectedValue(new Error('Admin error'));

    const res = await DELETE();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
