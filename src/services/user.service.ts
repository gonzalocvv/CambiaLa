import {
  userRepository,
  type CreateUserData,
  type OnboardingData,
} from '@/repositories/user.repository';

export class UsernameConflictError extends Error {
  constructor() {
    super('USERNAME_TAKEN');
    this.name = 'UsernameConflictError';
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
};
