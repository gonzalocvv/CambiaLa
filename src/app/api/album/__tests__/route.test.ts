import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetUserAlbum = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/sticker.service', () => ({
  stickerService: { getUserAlbum: mockGetUserAlbum },
}));

import { GET } from '../route';

beforeEach(() => vi.clearAllMocks());

const ALBUM_ID = 'album-1';

function makeAlbumResponse() {
  return {
    albumId: ALBUM_ID,
    stickers: [
      {
        id: 's1',
        number: 'URU1',
        name: null,
        team: 'URU',
        rarity: 'comun',
        isSpecial: false,
        count: 0,
      },
    ],
    stats: { total: 1, have: 0, missing: 1, duplicates: 0, percentComplete: 0 },
  };
}

describe('GET /api/album', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when album not found', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-1', onboardingDoneAt: new Date() });
    mockGetUserAlbum.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Album not found');
  });

  it('returns 200 with album data when authenticated', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-1', onboardingDoneAt: new Date() });
    mockGetUserAlbum.mockResolvedValue(makeAlbumResponse());

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.albumId).toBe(ALBUM_ID);
    expect(body.stickers).toHaveLength(1);
    expect(body.stats.total).toBe(1);
    expect(mockGetUserAlbum).toHaveBeenCalledWith('user-1');
  });
});
