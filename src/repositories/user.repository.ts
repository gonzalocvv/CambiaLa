import { prisma } from '@/lib/prisma';

export type CreateUserData = {
  email: string;
  name?: string;
  avatarUrl?: string;
};

export type OnboardingData = {
  username: string;
  city: string;
  neighborhood?: string;
};

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, onboardingDoneAt: true },
    });
  },

  upsertByEmail(data: CreateUserData) {
    return prisma.user.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date() },
      select: { id: true, email: true, username: true, onboardingDoneAt: true },
    });
  },

  async isUsernameAvailable(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return user === null;
  },

  updateOnboarding(userId: string, data: OnboardingData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        username: data.username,
        city: data.city,
        neighborhood: data.neighborhood ?? null,
        onboardingDoneAt: new Date(),
      },
      select: { id: true, username: true, onboardingDoneAt: true },
    });
  },
};
