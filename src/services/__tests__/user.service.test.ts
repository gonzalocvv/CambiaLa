import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRepo = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  upsertByEmail: vi.fn(),
  isUsernameAvailable: vi.fn(),
  updateOnboarding: vi.fn(),
  findById: vi.fn(),
  updateProfile: vi.fn(),
  updateLocation: vi.fn(),
}));

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockRepo,
}));

import { userService, UsernameConflictError, UserNotFoundError } from '../user.service';

beforeEach(() => vi.clearAllMocks());

describe('userService.getOrCreate', () => {
  it('delegates to upsertByEmail', async () => {
    const user = {
      id: 'cuid-1',
      email: 'test@example.com',
      username: null,
      onboardingDoneAt: null,
    };
    mockRepo.upsertByEmail.mockResolvedValue(user);
    const result = await userService.getOrCreate({ email: 'test@example.com' });
    expect(result).toEqual(user);
    expect(mockRepo.upsertByEmail).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});

describe('userService.findByEmail', () => {
  it('returns user when found', async () => {
    const user = {
      id: 'cuid-1',
      email: 'test@example.com',
      username: null,
      onboardingDoneAt: null,
    };
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

describe('userService.checkUsernameAvailability', () => {
  it('returns true when available', async () => {
    mockRepo.isUsernameAvailable.mockResolvedValue(true);
    const result = await userService.checkUsernameAvailability('freename');
    expect(result).toBe(true);
    expect(mockRepo.isUsernameAvailable).toHaveBeenCalledWith('freename');
  });

  it('returns false when taken', async () => {
    mockRepo.isUsernameAvailable.mockResolvedValue(false);
    const result = await userService.checkUsernameAvailability('taken');
    expect(result).toBe(false);
  });
});

describe('userService.completeOnboarding', () => {
  const onboardingData = { username: 'gonza', city: 'Montevideo', neighborhood: 'Pocitos' };

  it('saves onboarding when username is available', async () => {
    mockRepo.isUsernameAvailable.mockResolvedValue(true);
    mockRepo.updateOnboarding.mockResolvedValue({});
    await userService.completeOnboarding('cuid-1', onboardingData);
    expect(mockRepo.updateOnboarding).toHaveBeenCalledWith('cuid-1', onboardingData);
  });

  it('throws UsernameConflictError when username is taken', async () => {
    mockRepo.isUsernameAvailable.mockResolvedValue(false);
    await expect(userService.completeOnboarding('cuid-1', onboardingData)).rejects.toBeInstanceOf(
      UsernameConflictError,
    );
    expect(mockRepo.updateOnboarding).not.toHaveBeenCalled();
  });
});

describe('userService.getUserProfile', () => {
  it('returns user when found', async () => {
    const user = {
      id: 'cuid-1',
      username: 'gonza',
      name: 'Gonzalo',
      bio: null,
      avatarUrl: null,
      city: 'Montevideo',
      neighborhood: 'Pocitos',
    };
    mockRepo.findById.mockResolvedValue(user);
    const result = await userService.getUserProfile('cuid-1');
    expect(result).toEqual(user);
    expect(mockRepo.findById).toHaveBeenCalledWith('cuid-1');
  });

  it('throws UserNotFoundError when user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(userService.getUserProfile('nonexistent')).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});

describe('userService.updateProfile', () => {
  it('calls updateProfile repo method when user exists', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'cuid-1' });
    mockRepo.updateProfile.mockResolvedValue(undefined);
    await userService.updateProfile('cuid-1', { name: 'Gonzalo', bio: 'Bio' });
    expect(mockRepo.updateProfile).toHaveBeenCalledWith('cuid-1', { name: 'Gonzalo', bio: 'Bio' });
  });

  it('throws UserNotFoundError when user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(userService.updateProfile('nonexistent', { name: 'X' })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    expect(mockRepo.updateProfile).not.toHaveBeenCalled();
  });
});

describe('userService.updateLocation', () => {
  it('calls updateLocation repo method when user exists', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'cuid-1' });
    mockRepo.updateLocation.mockResolvedValue(undefined);
    await userService.updateLocation('cuid-1', { city: 'Salto' });
    expect(mockRepo.updateLocation).toHaveBeenCalledWith('cuid-1', { city: 'Salto' });
  });

  it('throws UserNotFoundError when user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      userService.updateLocation('nonexistent', { city: 'Salto' }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
    expect(mockRepo.updateLocation).not.toHaveBeenCalled();
  });
});
