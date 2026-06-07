import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockBulkUpdateCounts = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn(() => ({ allowed: true, remaining: 29 })));

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/sticker.service', () => ({
  stickerService: { bulkUpdateCounts: mockBulkUpdateCounts },
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { PATCH } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 29 });
});

const SESSION = { userId: 'user-1', onboardingDoneAt: new Date() };

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/album/stickers', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(raw: string) {
  return new Request('http://localhost/api/album/stickers', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: raw,
  });
}

describe('PATCH /api/album/stickers — rate limit', () => {
  it('429 cuando se excede el rate limit', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 });

    const res = await PATCH(makeRequest({ changes: [{ stickerId: 's1', count: 1 }] }) as never);

    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('rate_limited');
    expect(mockBulkUpdateCounts).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/album/stickers (bulk)', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ changes: [{ stickerId: 's1', count: 1 }] }) as never);

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
    expect(mockBulkUpdateCounts).not.toHaveBeenCalled();
  });

  it('returns 400 on an empty changes array', async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await PATCH(makeRequest({ changes: [] }) as never);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid input');
  });

  it('returns 400 when a count is out of range', async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await PATCH(makeRequest({ changes: [{ stickerId: 's1', count: 100 }] }) as never);

    expect(res.status).toBe(400);
  });

  it('returns 400 when changes is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await PATCH(makeRequest({}) as never);

    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed JSON body', async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await PATCH(makeRawRequest('not json') as never);

    expect(res.status).toBe(400);
    expect(mockBulkUpdateCounts).not.toHaveBeenCalled();
  });

  it('returns 200 with { ok, applied, ignored } and calls the service', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockBulkUpdateCounts.mockResolvedValue({ applied: 2, ignored: 1 });

    const changes = [
      { stickerId: 's1', count: 1 },
      { stickerId: 's2', count: 2 },
    ];
    const res = await PATCH(makeRequest({ changes }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, applied: 2, ignored: 1 });
    expect(mockBulkUpdateCounts).toHaveBeenCalledWith('user-1', changes);
  });
});
