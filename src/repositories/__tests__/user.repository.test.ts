import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUserPrisma = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
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
    const result = await userRepository.upsertByEmail({
      email: 'test@example.com',
      name: 'Test User',
    });
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

describe('userRepository.isUsernameAvailable', () => {
  it('returns true when username is not taken', async () => {
    mockUserPrisma.findUnique.mockResolvedValue(null);
    const result = await userRepository.isUsernameAvailable('freename');
    expect(result).toBe(true);
    expect(mockUserPrisma.findUnique).toHaveBeenCalledWith({
      where: { username: 'freename' },
      select: { id: true },
    });
  });

  it('returns false when username is taken', async () => {
    mockUserPrisma.findUnique.mockResolvedValue({ id: 'cuid-other' });
    const result = await userRepository.isUsernameAvailable('takenname');
    expect(result).toBe(false);
  });
});

describe('userRepository.updateOnboarding', () => {
  it('saves username, city and onboardingDoneAt', async () => {
    const updated = { id: 'cuid-user-1', username: 'gonza', onboardingDoneAt: new Date() };
    mockUserPrisma.update.mockResolvedValue(updated);
    const result = await userRepository.updateOnboarding('cuid-user-1', {
      username: 'gonza',
      city: 'Montevideo',
      neighborhood: 'Pocitos',
    });
    expect(result).toEqual(updated);
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cuid-user-1' },
        data: expect.objectContaining({
          username: 'gonza',
          city: 'Montevideo',
          neighborhood: 'Pocitos',
          onboardingDoneAt: expect.any(Date),
        }),
      }),
    );
  });

  it('sets neighborhood to null when not Montevideo', async () => {
    const updated = { id: 'cuid-user-1', username: 'gonza', onboardingDoneAt: new Date() };
    mockUserPrisma.update.mockResolvedValue(updated);
    await userRepository.updateOnboarding('cuid-user-1', { username: 'gonza', city: 'Salto' });
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ neighborhood: null }),
      }),
    );
  });
});

void NOW;
