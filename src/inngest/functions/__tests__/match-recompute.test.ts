import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMatchService = vi.hoisted(() => ({
  recomputeForUser: vi.fn().mockResolvedValue({ matched: 3 }),
}));

vi.mock('@/services/match.service', () => ({ matchService: mockMatchService }));
vi.mock('@/inngest/client', () => ({ inngest: { createFunction: vi.fn() } }));

import { handleMatchRecompute } from '../match-recompute';

describe('handleMatchRecompute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls recomputeForUser with the userId from event data', async () => {
    const result = await handleMatchRecompute({ userId: 'user-123' });
    expect(mockMatchService.recomputeForUser).toHaveBeenCalledOnce();
    expect(mockMatchService.recomputeForUser).toHaveBeenCalledWith('user-123');
    expect(result).toEqual({ matched: 3 });
  });

  it('propagates errors from recomputeForUser (Inngest handles retries)', async () => {
    mockMatchService.recomputeForUser.mockRejectedValue(new Error('engine down'));
    await expect(handleMatchRecompute({ userId: 'user-x' })).rejects.toThrow('engine down');
  });
});
