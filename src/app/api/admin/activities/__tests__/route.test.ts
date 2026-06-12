import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockListForAdmin = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/activity.service', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/activity.service')>(
      '@/services/activity.service',
    );
  return {
    ...actual,
    activityService: { createActivity: mockCreate, listForAdmin: mockListForAdmin },
  };
});

import { BannerValidationError } from '@/lib/storage/activity-banner';

import { GET, POST } from '../route';

const adminSession = { userId: 'admin-1', onboardingDoneAt: new Date(), role: 'admin' };
const userSession = { userId: 'user-1', onboardingDoneAt: new Date(), role: 'user' };

function makeForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.append('title', 'Juntada en Tacuarembó');
  fd.append('department', 'Tacuarembó');
  fd.append('startsAt', '2026-07-01T18:00:00.000Z');
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

function postReq(form: FormData): Request {
  return new Request('http://localhost/api/admin/activities', { method: 'POST', body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListForAdmin.mockResolvedValue({ activities: [], total: 0, department: null });
  mockCreate.mockResolvedValue({ id: 'act-1', title: 'Juntada en Tacuarembó' });
});

describe('GET /api/admin/activities', () => {
  it('returns 403 for a non-admin', async () => {
    mockGetSession.mockResolvedValue(userSession);
    const res = await GET(new Request('http://localhost/api/admin/activities'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with the admin list', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await GET(new Request('http://localhost/api/admin/activities'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/admin/activities', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(postReq(makeForm()));
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-admin', async () => {
    mockGetSession.mockResolvedValue(userSession);
    const res = await POST(postReq(makeForm()));
    expect(res.status).toBe(403);
  });

  it('creates the activity and returns 201 for an admin', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await POST(postReq(makeForm()));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Juntada en Tacuarembó', department: 'Tacuarembó' }),
      'admin-1',
      null,
    );
  });

  it('returns 400 for invalid input (missing title)', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const form = makeForm();
    form.delete('title');
    const res = await POST(postReq(form));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when the banner fails validation', async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockCreate.mockRejectedValue(new BannerValidationError('banner_too_large'));
    const res = await POST(postReq(makeForm()));
    expect(res.status).toBe(400);
  });
});
