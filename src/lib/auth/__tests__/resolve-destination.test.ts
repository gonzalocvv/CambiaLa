import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

const mockUserService = vi.hoisted(() => ({ getOrCreate: vi.fn() }));
vi.mock('@/services/user.service', () => ({ userService: mockUserService }));

import { resolveDestinationForUser } from '../resolve-destination';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    email: 'gonza@example.com',
    user_metadata: { full_name: 'Gonza', avatar_url: 'http://img/avatar.png' },
    ...overrides,
  } as User;
}

beforeEach(() => vi.clearAllMocks());

describe('resolveDestinationForUser', () => {
  it('da de alta al usuario con nombre y avatar del provider', async () => {
    mockUserService.getOrCreate.mockResolvedValue({ onboardingDoneAt: new Date() });
    await resolveDestinationForUser(makeUser());
    expect(mockUserService.getOrCreate).toHaveBeenCalledWith({
      email: 'gonza@example.com',
      name: 'Gonza',
      avatarUrl: 'http://img/avatar.png',
    });
  });

  it('manda a /onboarding cuando no completó el onboarding', async () => {
    mockUserService.getOrCreate.mockResolvedValue({ onboardingDoneAt: null });
    expect(await resolveDestinationForUser(makeUser())).toBe('/onboarding');
  });

  it('manda a /matches (default) cuando ya completó el onboarding', async () => {
    mockUserService.getOrCreate.mockResolvedValue({ onboardingDoneAt: new Date() });
    expect(await resolveDestinationForUser(makeUser())).toBe('/matches');
  });

  it('respeta el next provisto', async () => {
    mockUserService.getOrCreate.mockResolvedValue({ onboardingDoneAt: new Date() });
    expect(await resolveDestinationForUser(makeUser(), '/album')).toBe('/album');
  });
});
