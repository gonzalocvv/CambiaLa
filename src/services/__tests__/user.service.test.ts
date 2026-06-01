import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  upsertByEmail: vi.fn(),
}));

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockRepo,
}));

import { userService } from '../user.service';

beforeEach(() => vi.clearAllMocks());

describe('userService.getOrCreate', () => {
  it('delegates to upsertByEmail', async () => {
    const user = { id: 'cuid-1', email: 'test@example.com', username: null, onboardingDoneAt: null };
    mockRepo.upsertByEmail.mockResolvedValue(user);
    const result = await userService.getOrCreate({ email: 'test@example.com' });
    expect(result).toEqual(user);
    expect(mockRepo.upsertByEmail).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});

describe('userService.findByEmail', () => {
  it('returns user when found', async () => {
    const user = { id: 'cuid-1', email: 'test@example.com', username: null, onboardingDoneAt: null };
    mockRepo.findByEmail.mockResolvedValue(user);
    const result = await userService.findByEmail('test@example.com');
    expect(result).toEqual(user);
  });

  it('returns null when not found', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    const result = await userService.findByEmail('missing@example.com');
    expect(result).toBeNull();
  });
});
