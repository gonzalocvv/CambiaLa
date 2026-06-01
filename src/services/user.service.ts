import { userRepository, type CreateUserData } from '@/repositories/user.repository';

export const userService = {
  async getOrCreate(data: CreateUserData) {
    return userRepository.upsertByEmail(data);
  },

  async findByEmail(email: string) {
    return userRepository.findByEmail(email);
  },
};
