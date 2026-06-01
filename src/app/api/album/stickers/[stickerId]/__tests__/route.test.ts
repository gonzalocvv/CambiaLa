import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockUpdateStickerCount = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/sticker.service', () => ({
  StickerNotFoundError: class StickerNotFoundError extends Error {
    constructor() {
      super('Sticker not found');
      this.name = 'StickerNotFoundError';
    }
  },
  stickerService: { updateStickerCount: mockUpdateStickerCount },
}));

import { PATCH } from '../route';

beforeEach(() => vi.clearAllMocks());

const STICKER_ID = 'sticker-1';
const SESSION = { userId: 'user-1', onboardingDoneAt: new Date() };

function makeRequest(body: unknown) {
  return new Request(`http://localhost/api/album/stickers/${STICKER_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function makeParams(stickerId = STICKER_ID) {
  return Promise.resolve({ stickerId });
}

describe('PATCH /api/album/stickers/[stickerId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ count: 1 }) as never, { params: makeParams() });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when count is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await PATCH(makeRequest({}) as never, { params: makeParams() });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('returns 400 when count is out of range', async () => {
    mockGetSession.mockResolvedValue(SESSION);

    const res = await PATCH(makeRequest({ count: 100 }) as never, { params: makeParams() });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('returns 404 when sticker not found', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const { StickerNotFoundError } = await import('@/services/sticker.service');
    mockUpdateStickerCount.mockRejectedValue(new StickerNotFoundError());

    const res = await PATCH(makeRequest({ count: 1 }) as never, { params: makeParams() });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Sticker not found');
  });

  it('returns 200 with updated count when successful', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUpdateStickerCount.mockResolvedValue({ count: 2 });

    const res = await PATCH(makeRequest({ count: 2 }) as never, { params: makeParams() });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBe(2);
    expect(mockUpdateStickerCount).toHaveBeenCalledWith('user-1', STICKER_ID, 2);
  });

  it('sets count to 0 (marking as missing)', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockUpdateStickerCount.mockResolvedValue({ count: 0 });

    const res = await PATCH(makeRequest({ count: 0 }) as never, { params: makeParams() });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(0);
  });

  it('re-throws unexpected errors', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const unexpected = new Error('DB down');
    mockUpdateStickerCount.mockRejectedValue(unexpected);

    await expect(
      PATCH(makeRequest({ count: 1 }) as never, { params: makeParams() }),
    ).rejects.toThrow('DB down');
  });
});
