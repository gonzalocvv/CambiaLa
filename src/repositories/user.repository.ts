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

export type UpdateProfileData = {
  name?: string;
  bio?: string;
  whatsapp?: string;
  publicProfile?: boolean;
};

export type UpdateLocationData = {
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

  findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
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
      },
    });
  },

  updateProfile(userId: string, data: UpdateProfileData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name || null,
        bio: data.bio || null,
        ...(data.whatsapp !== undefined ? { whatsapp: data.whatsapp || null } : {}),
        ...(data.publicProfile !== undefined ? { publicProfile: data.publicProfile } : {}),
      },
      select: { id: true, name: true, bio: true, whatsapp: true, publicProfile: true },
    });
  },

  updateLocation(userId: string, data: UpdateLocationData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        city: data.city,
        neighborhood: data.neighborhood ?? null,
      },
      select: { id: true, city: true, neighborhood: true },
    });
  },
};
