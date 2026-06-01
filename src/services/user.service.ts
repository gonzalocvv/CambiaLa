import {
  userRepository,
  type CreateUserData,
  type OnboardingData,
  type UpdateProfileData,
  type UpdateLocationData,
} from '@/repositories/user.repository';

export class UsernameConflictError extends Error {
  constructor() {
    super('USERNAME_TAKEN');
    this.name = 'UsernameConflictError';
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('USER_NOT_FOUND');
    this.name = 'UserNotFoundError';
  }
}

export class PublicProfileNotFoundError extends Error {
  constructor() {
    super('PUBLIC_PROFILE_NOT_FOUND');
    this.name = 'PublicProfileNotFoundError';
  }
}

export const userService = {
  async getOrCreate(data: CreateUserData) {
    return userRepository.upsertByEmail(data);
  },

  async findByEmail(email: string) {
    return userRepository.findByEmail(email);
  },

  async checkUsernameAvailability(username: string): Promise<boolean> {
    return userRepository.isUsernameAvailable(username);
  },

  async completeOnboarding(userId: string, data: OnboardingData): Promise<void> {
    const available = await userRepository.isUsernameAvailable(data.username);
    if (!available) throw new UsernameConflictError();
    await userRepository.updateOnboarding(userId, data);
  },

  async getUserProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new UserNotFoundError();
    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileData): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UserNotFoundError();
    await userRepository.updateProfile(userId, data);
  },

  async updateLocation(userId: string, data: UpdateLocationData): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UserNotFoundError();
    await userRepository.updateLocation(userId, data);
  },

  async getPublicProfileUser(username: string) {
    const user = await userRepository.findByUsername(username);
    if (!user || !user.publicProfile) throw new PublicProfileNotFoundError();
    return user;
  },
};
