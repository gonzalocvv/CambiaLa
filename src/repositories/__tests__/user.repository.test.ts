import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUserPrisma = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { user: mockUserPrisma },
}));

import { userRepository } from '../user.repository';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeDbUser(overrides: object = {}) {
  return {
    id: 'cuid-user-1',
    email: 'test@example.com',
    username: null,
    onboardingDoneAt: null,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('userRepository.findByEmail', () => {
  it('returns user when found', async () => {
    const user = makeDbUser();
    mockUserPrisma.findUnique.mockResolvedValue(user);
    const result = await userRepository.findByEmail('test@example.com');
    expect(result).toEqual(user);
    expect(mockUserPrisma.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: { id: true, email: true, username: true, onboardingDoneAt: true },
    });
  });

  it('returns null when not found', async () => {
    mockUserPrisma.findUnique.mockResolvedValue(null);
    const result = await userRepository.findByEmail('missing@example.com');
    expect(result).toBeNull();
  });
});

describe('userRepository.upsertByEmail', () => {
  it('creates a new user on first login', async () => {
    const user = makeDbUser();
    mockUserPrisma.upsert.mockResolvedValue(user);
    const result = await userRepository.upsertByEmail({ email: 'test@example.com', name: 'Test User' });
    expect(result).toEqual(user);
    expect(mockUserPrisma.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@example.com' },
        create: expect.objectContaining({ email: 'test@example.com', name: 'Test User' }),
        update: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      }),
    );
  });

  it('updates lastSeenAt on subsequent logins', async () => {
    const user = makeDbUser({ username: 'testuser' });
    mockUserPrisma.upsert.mockResolvedValue(user);
    const result = await userRepository.upsertByEmail({ email: 'test@example.com' });
    expect(result.username).toBe('testuser');
  });
});

void NOW;
