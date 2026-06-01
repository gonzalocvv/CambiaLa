import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetUserProfile = vi.hoisted(() => vi.fn());
const mockUpdateProfile = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/user.service', () => ({
  userService: {
    getUserProfile: mockGetUserProfile,
    updateProfile: mockUpdateProfile,
  },
  UserNotFoundError: class UserNotFoundError extends Error {
    constructor() {
      super('USER_NOT_FOUND');
      this.name = 'UserNotFoundError';
    }
  },
}));

import { GET, PUT } from '../route';

function makeUserProfile(overrides: object = {}) {
  return {
    id: 'cuid-user-1',
    username: 'gonza',
    name: 'Gonzalo',
    bio: 'Coleccionista desde siempre',
    avatarUrl: null,
    city: 'Montevideo',
    neighborhood: 'Pocitos',
    whatsapp: null,
    publicProfile: false,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/settings', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 with user profile', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockGetUserProfile.mockResolvedValue(makeUserProfile());

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.username).toBe('gonza');
    expect(body.name).toBe('Gonzalo');
    expect(body.city).toBe('Montevideo');
    expect(mockGetUserProfile).toHaveBeenCalledWith('cuid-user-1');
  });
});

describe('PUT /api/settings', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PUT(
      new Request('http://localhost/api/settings', { method: 'PUT', body: '{}' }),
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when name exceeds 50 chars', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'a'.repeat(51) }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when bio exceeds 140 chars', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: 'x'.repeat(141) }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 200 and calls updateProfile with valid data', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockUpdateProfile.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Gonzalo', bio: 'Coleccionista' }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockUpdateProfile).toHaveBeenCalledWith('cuid-user-1', {
      name: 'Gonzalo',
      bio: 'Coleccionista',
    });
  });

  it('returns 400 when whatsapp format is invalid', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });

    const res = await PUT(
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: '099123456' }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('accepts valid whatsapp +598 number', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockUpdateProfile.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: '+59899123456' }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      'cuid-user-1',
      expect.objectContaining({ whatsapp: '+59899123456' }),
    );
  });

  it('accepts publicProfile boolean', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockUpdateProfile.mockResolvedValue(undefined);

    const res = await PUT(
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicProfile: true }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      'cuid-user-1',
      expect.objectContaining({ publicProfile: true }),
    );
  });

  it('returns 404 when user not found', async () => {
    const { UserNotFoundError } = await import('@/services/user.service');
    mockGetSession.mockResolvedValue({ userId: 'nonexistent', onboardingDoneAt: new Date() });
    mockUpdateProfile.mockRejectedValue(new UserNotFoundError());

    const res = await PUT(
      new Request('http://localhost/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' }),
      }),
    );

    expect(res.status).toBe(404);
  });

  it('rethrows unexpected errors', async () => {
    mockGetSession.mockResolvedValue({ userId: 'cuid-user-1', onboardingDoneAt: new Date() });
    mockUpdateProfile.mockRejectedValue(new Error('db error'));

    await expect(
      PUT(
        new Request('http://localhost/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'X' }),
        }),
      ),
    ).rejects.toThrow('db error');
  });
});
