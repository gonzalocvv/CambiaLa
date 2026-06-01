import { prisma } from '@/lib/prisma';

export type CreateUserData = {
  email: string;
  name?: string;
  avatarUrl?: string;
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
};
