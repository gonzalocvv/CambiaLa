import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUserPrisma = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const mockRatingPrisma = vi.hoisted(() => ({ deleteMany: vi.fn() }));
const mockMatchPrisma = vi.hoisted(() => ({ deleteMany: vi.fn() }));
const mockMessagePrisma = vi.hoisted(() => ({ deleteMany: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: mockUserPrisma,
    rating: mockRatingPrisma,
    match: mockMatchPrisma,
    message: mockMessagePrisma,
  },
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
      select: { id: true, email: true, username: true, onboardingDoneAt: true, role: true },
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

describe('userRepository.findById', () => {
  it('returns user profile when found', async () => {
    const user = {
      id: 'cuid-user-1',
      username: 'gonza',
      name: 'Gonzalo',
      bio: null,
      avatarUrl: null,
      city: 'Montevideo',
      neighborhood: 'Pocitos',
      whatsapp: null,
      publicProfile: false,
    };
    mockUserPrisma.findUnique.mockResolvedValue(user);
    const result = await userRepository.findById('cuid-user-1');
    expect(result).toEqual(user);
    expect(mockUserPrisma.findUnique).toHaveBeenCalledWith({
      where: { id: 'cuid-user-1' },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
        city: true,
        neighborhood: true,
        whatsapp: true,
        publicProfile: true,
        notifyOnMatch: true,
        emailFrequency: true,
        pushEnabled: true,
        participatesInMatchmaking: true,
        matchRadius: true,
        offerUniques: true,
        acceptUnbalanced: true,
      },
    });
  });

  it('returns null when not found', async () => {
    mockUserPrisma.findUnique.mockResolvedValue(null);
    const result = await userRepository.findById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('userRepository.updateProfile', () => {
  it('updates name and bio', async () => {
    const updated = {
      id: 'cuid-user-1',
      name: 'Gonzalo',
      bio: 'Coleccionista',
      whatsapp: null,
      publicProfile: false,
    };
    mockUserPrisma.update.mockResolvedValue(updated);
    const result = await userRepository.updateProfile('cuid-user-1', {
      name: 'Gonzalo',
      bio: 'Coleccionista',
    });
    expect(result).toEqual(updated);
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cuid-user-1' },
        data: { name: 'Gonzalo', bio: 'Coleccionista' },
      }),
    );
  });

  it('sets name/bio to null when empty string provided', async () => {
    const updated = {
      id: 'cuid-user-1',
      name: null,
      bio: null,
      whatsapp: null,
      publicProfile: false,
    };
    mockUserPrisma.update.mockResolvedValue(updated);
    await userRepository.updateProfile('cuid-user-1', { name: '', bio: '' });
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: null, bio: null },
      }),
    );
  });

  it('updates whatsapp and sets it to null when empty string', async () => {
    const updated = {
      id: 'cuid-user-1',
      name: null,
      bio: null,
      whatsapp: null,
      publicProfile: false,
    };
    mockUserPrisma.update.mockResolvedValue(updated);
    await userRepository.updateProfile('cuid-user-1', { whatsapp: '' });
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whatsapp: null }),
      }),
    );
  });

  it('stores whatsapp value when provided', async () => {
    const updated = {
      id: 'cuid-user-1',
      name: null,
      bio: null,
      whatsapp: '+59899123456',
      publicProfile: false,
    };
    mockUserPrisma.update.mockResolvedValue(updated);
    await userRepository.updateProfile('cuid-user-1', { whatsapp: '+59899123456' });
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whatsapp: '+59899123456' }),
      }),
    );
  });

  it('updates publicProfile when provided', async () => {
    const updated = {
      id: 'cuid-user-1',
      name: null,
      bio: null,
      whatsapp: null,
      publicProfile: true,
    };
    mockUserPrisma.update.mockResolvedValue(updated);
    await userRepository.updateProfile('cuid-user-1', { publicProfile: true });
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publicProfile: true }),
      }),
    );
  });

  it('does not include publicProfile in data when not provided', async () => {
    const updated = {
      id: 'cuid-user-1',
      name: 'X',
      bio: null,
      whatsapp: null,
      publicProfile: false,
    };
    mockUserPrisma.update.mockResolvedValue(updated);
    await userRepository.updateProfile('cuid-user-1', { name: 'X' });
    const callData = mockUserPrisma.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(callData).not.toHaveProperty('publicProfile');
  });
});

describe('userRepository.updateLocation', () => {
  it('updates city and neighborhood', async () => {
    const updated = { id: 'cuid-user-1', city: 'Montevideo', neighborhood: 'Pocitos' };
    mockUserPrisma.update.mockResolvedValue(updated);
    const result = await userRepository.updateLocation('cuid-user-1', {
      city: 'Montevideo',
      neighborhood: 'Pocitos',
    });
    expect(result).toEqual(updated);
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cuid-user-1' },
        data: { city: 'Montevideo', neighborhood: 'Pocitos' },
      }),
    );
  });

  it('sets neighborhood to null when not provided', async () => {
    mockUserPrisma.update.mockResolvedValue({
      id: 'cuid-user-1',
      city: 'Salto',
      neighborhood: null,
    });
    await userRepository.updateLocation('cuid-user-1', { city: 'Salto' });
    expect(mockUserPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { city: 'Salto', neighborhood: null },
      }),
    );
  });
});

describe('userRepository.updateReputation', () => {
  it('updates reputation and tradesCompleted for a user', async () => {
    const updated = { id: 'cuid-user-1', reputation: 4.2, tradesCompleted: 5 };
    mockUserPrisma.update.mockResolvedValue(updated);

    const result = await userRepository.updateReputation('cuid-user-1', {
      reputation: 4.2,
      tradesCompleted: 5,
    });

    expect(result).toEqual(updated);
    expect(mockUserPrisma.update).toHaveBeenCalledWith({
      where: { id: 'cuid-user-1' },
      data: { reputation: 4.2, tradesCompleted: 5 },
      select: { id: true, reputation: true, tradesCompleted: true },
    });
  });
});

describe('userRepository.findByUsername', () => {
  it('returns public profile when username exists', async () => {
    const user = {
      id: 'cuid-user-1',
      username: 'gonza',
      name: 'Gonzalo',
      bio: 'Coleccionista',
      avatarUrl: null,
      city: 'Montevideo',
      neighborhood: 'Pocitos',
      reputation: 4.5,
      tradesCompleted: 10,
      createdAt: NOW,
      publicProfile: true,
    };
    mockUserPrisma.findUnique.mockResolvedValue(user);
    const result = await userRepository.findByUsername('gonza');
    expect(result).toEqual(user);
    expect(mockUserPrisma.findUnique).toHaveBeenCalledWith({
      where: { username: 'gonza' },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
        city: true,
        neighborhood: true,
        reputation: true,
        tradesCompleted: true,
        createdAt: true,
        publicProfile: true,
      },
    });
  });

  it('returns null when username does not exist', async () => {
    mockUserPrisma.findUnique.mockResolvedValue(null);
    const result = await userRepository.findByUsername('nobody');
    expect(result).toBeNull();
  });
});

describe('userRepository.findAllForAdmin', () => {
  it('queries with search filter and pagination', async () => {
    const users = [
      {
        id: 'u1',
        email: 'a@test.com',
        username: 'gonza',
        name: null,
        city: null,
        role: 'user',
        isSuspended: false,
        createdAt: new Date(),
      },
    ];
    mockUserPrisma.findMany = vi.fn().mockResolvedValue(users);
    mockUserPrisma.count = vi.fn().mockResolvedValue(1);

    const result = await userRepository.findAllForAdmin({ search: 'gonza', page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.users).toEqual(users);
    expect(mockUserPrisma.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        where: expect.objectContaining({ OR: expect.any(Array) }),
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('returns all users with no search filter', async () => {
    mockUserPrisma.findMany = vi.fn().mockResolvedValue([]);
    mockUserPrisma.count = vi.fn().mockResolvedValue(0);

    const result = await userRepository.findAllForAdmin({ page: 1, pageSize: 20 });

    expect(result.total).toBe(0);
    expect(mockUserPrisma.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('applies correct skip for page 2', async () => {
    mockUserPrisma.findMany = vi.fn().mockResolvedValue([]);
    mockUserPrisma.count = vi.fn().mockResolvedValue(0);

    await userRepository.findAllForAdmin({ page: 2, pageSize: 10 });

    expect(mockUserPrisma.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });
});

describe('userRepository.findByIdForAdmin', () => {
  it('returns full user detail', async () => {
    const user = {
      id: 'u1',
      email: 'a@test.com',
      username: 'gonza',
      name: null,
      bio: null,
      avatarUrl: null,
      city: null,
      neighborhood: null,
      role: 'user',
      isSuspended: false,
      reputation: 0,
      tradesCompleted: 0,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      onboardingDoneAt: null,
      publicProfile: false,
    };
    mockUserPrisma.findUnique.mockResolvedValue(user);

    const result = await userRepository.findByIdForAdmin('u1');
    expect(result).toEqual(user);
    expect(mockUserPrisma.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: expect.objectContaining({ email: true, role: true, isSuspended: true }),
    });
  });

  it('returns null when not found', async () => {
    mockUserPrisma.findUnique.mockResolvedValue(null);
    const result = await userRepository.findByIdForAdmin('nope');
    expect(result).toBeNull();
  });
});

describe('userRepository.updateSuspension', () => {
  it('sets isSuspended to true', async () => {
    const updated = { id: 'u1', isSuspended: true };
    mockUserPrisma.update.mockResolvedValue(updated);

    const result = await userRepository.updateSuspension('u1', true);
    expect(result).toEqual(updated);
    expect(mockUserPrisma.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isSuspended: true },
      select: { id: true, isSuspended: true },
    });
  });

  it('sets isSuspended to false (unsuspend)', async () => {
    const updated = { id: 'u1', isSuspended: false };
    mockUserPrisma.update.mockResolvedValue(updated);

    await userRepository.updateSuspension('u1', false);
    expect(mockUserPrisma.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isSuspended: false },
      select: { id: true, isSuspended: true },
    });
  });
});

describe('userRepository.deleteUserCascade', () => {
  it('deletes ratings, matches, messages, then user in order', async () => {
    mockRatingPrisma.deleteMany.mockResolvedValue({ count: 2 });
    mockMatchPrisma.deleteMany.mockResolvedValue({ count: 1 });
    mockMessagePrisma.deleteMany.mockResolvedValue({ count: 0 });
    mockUserPrisma.delete.mockResolvedValue({ id: 'cuid-user-1' });

    await userRepository.deleteUserCascade('cuid-user-1');

    expect(mockRatingPrisma.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ raterId: 'cuid-user-1' }, { ratedId: 'cuid-user-1' }] },
    });
    expect(mockMatchPrisma.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ userAId: 'cuid-user-1' }, { userBId: 'cuid-user-1' }] },
    });
    expect(mockMessagePrisma.deleteMany).toHaveBeenCalledWith({
      where: { fromUserId: 'cuid-user-1' },
    });
    expect(mockUserPrisma.delete).toHaveBeenCalledWith({ where: { id: 'cuid-user-1' } });

    // Verify order: ratings → matches → messages → user
    const ratingOrder = mockRatingPrisma.deleteMany.mock.invocationCallOrder[0];
    const matchOrder = mockMatchPrisma.deleteMany.mock.invocationCallOrder[0];
    const messageOrder = mockMessagePrisma.deleteMany.mock.invocationCallOrder[0];
    const userOrder = mockUserPrisma.delete.mock.invocationCallOrder[0];
    expect(ratingOrder).toBeLessThan(matchOrder);
    expect(matchOrder).toBeLessThan(messageOrder);
    expect(messageOrder).toBeLessThan(userOrder);
  });
});

void NOW;
