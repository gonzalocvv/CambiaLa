import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMatchService = vi.hoisted(() => ({
  cleanupExpiredMatches: vi.fn().mockResolvedValue(0),
}));

vi.mock('@/services/match.service', () => ({ matchService: mockMatchService }));
vi.mock('@/inngest/client', () => ({ inngest: { createFunction: vi.fn() } }));

import { handleCleanupMatches } from '../cleanup-matches';

describe('handleCleanupMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls cleanupExpiredMatches with default 30-day window', async () => {
    await handleCleanupMatches();
    expect(mockMatchService.cleanupExpiredMatches).toHaveBeenCalledOnce();
    expect(mockMatchService.cleanupExpiredMatches).toHaveBeenCalledWith(30);
  });

  it('returns the count of matches marked inactive', async () => {
    mockMatchService.cleanupExpiredMatches.mockResolvedValue(5);
    const result = await handleCleanupMatches();
    expect(result).toEqual({ marked: 5 });
  });

  it('returns { marked: 0 } when no matches expired', async () => {
    mockMatchService.cleanupExpiredMatches.mockResolvedValue(0);
    const result = await handleCleanupMatches();
    expect(result).toEqual({ marked: 0 });
  });

  it('propagates errors so Inngest can retry', async () => {
    mockMatchService.cleanupExpiredMatches.mockRejectedValue(new Error('db error'));
    await expect(handleCleanupMatches()).rejects.toThrow('db error');
  });
});
