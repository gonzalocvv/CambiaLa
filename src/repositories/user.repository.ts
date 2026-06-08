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
      select: { id: true, email: true, username: true, onboardingDoneAt: true, role: true },
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

  // RF-406: datos mínimos para mandar un mail transaccional a un usuario por id
  // (el resto del repo no expone el email en findById).
  findEmailRecipient(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, username: true, emailFrequency: true },
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

  async findAllForAdmin(opts: { search?: string; page: number; pageSize: number }) {
    const { search, page, pageSize } = opts;
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          city: true,
          role: true,
          isSuspended: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return { users, total };
  },

  findByIdForAdmin(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
        city: true,
        neighborhood: true,
        role: true,
        isSuspended: true,
        publicProfile: true,
        reputation: true,
        tradesCompleted: true,
        createdAt: true,
        lastSeenAt: true,
        onboardingDoneAt: true,
      },
    });
  },

  updateSuspension(userId: string, isSuspended: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isSuspended },
      select: { id: true, isSuspended: true },
    });
  },

  async deleteUserCascade(userId: string): Promise<void> {
    // Delete in FK-safe order (Match/Rating/Message have no cascade from User)
    await prisma.rating.deleteMany({
      where: { OR: [{ raterId: userId }, { ratedId: userId }] },
    });
    // Deleting matches cascades their messages (Message.matchId onDelete: Cascade)
    await prisma.match.deleteMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
    });
    // Safety net for any messages sent by user not covered by match cascade
    await prisma.message.deleteMany({ where: { fromUserId: userId } });
    // User delete cascades UserSticker and Notification
    await prisma.user.delete({ where: { id: userId } });
  },
};
