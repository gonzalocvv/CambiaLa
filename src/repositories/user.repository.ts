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

export type UpdateReputationData = {
  reputation: number;
  tradesCompleted: number;
};

export type UpdateNotificationsData = {
  notifyOnMatch?: boolean;
  emailFrequency?: 'instant' | 'daily' | 'weekly' | 'never';
  pushEnabled?: boolean;
};

export type UpdateMatchmakingData = {
  participatesInMatchmaking?: boolean;
  matchRadius?: 'neighborhood' | 'department' | 'country';
  offerUniques?: boolean;
  acceptUnbalanced?: boolean;
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
        notifyOnMatch: true,
        emailFrequency: true,
        pushEnabled: true,
        participatesInMatchmaking: true,
        matchRadius: true,
        offerUniques: true,
        acceptUnbalanced: true,
      },
    });
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
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

  updateReputation(userId: string, data: UpdateReputationData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        reputation: data.reputation,
        tradesCompleted: data.tradesCompleted,
      },
      select: { id: true, reputation: true, tradesCompleted: true },
    });
  },

  updateNotifications(userId: string, data: UpdateNotificationsData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.notifyOnMatch !== undefined ? { notifyOnMatch: data.notifyOnMatch } : {}),
        ...(data.emailFrequency !== undefined ? { emailFrequency: data.emailFrequency } : {}),
        ...(data.pushEnabled !== undefined ? { pushEnabled: data.pushEnabled } : {}),
      },
      select: { id: true, notifyOnMatch: true, emailFrequency: true, pushEnabled: true },
    });
  },

  updateMatchmaking(userId: string, data: UpdateMatchmakingData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.participatesInMatchmaking !== undefined
          ? { participatesInMatchmaking: data.participatesInMatchmaking }
          : {}),
        ...(data.matchRadius !== undefined ? { matchRadius: data.matchRadius } : {}),
        ...(data.offerUniques !== undefined ? { offerUniques: data.offerUniques } : {}),
        ...(data.acceptUnbalanced !== undefined ? { acceptUnbalanced: data.acceptUnbalanced } : {}),
      },
      select: {
        id: true,
        participatesInMatchmaking: true,
        matchRadius: true,
        offerUniques: true,
        acceptUnbalanced: true,
      },
    });
  },
};
