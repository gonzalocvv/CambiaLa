import type { Match, Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { MatchStatus, UpsertMatchInput } from '@/lib/validations/match.schema';

export type MatchWithPartners = Prisma.MatchGetPayload<{
  include: { userA: true; userB: true };
}>;

export type MatchWithPartnersAndMessages = Prisma.MatchGetPayload<{
  include: { userA: true; userB: true; messages: true };
}>;

export const matchRepository = {
  async upsert(data: UpsertMatchInput): Promise<Match> {
    return prisma.match.upsert({
      where: {
        userAId_userBId: { userAId: data.userAId, userBId: data.userBId },
      },
      create: {
        userAId: data.userAId,
        userBId: data.userBId,
        aToB: data.aToB,
        bToA: data.bToA,
        score: data.score,
        status: 'active',
      },
      update: {
        aToB: data.aToB,
        bToA: data.bToA,
        score: data.score,
        status: 'active',
      },
    });
  },

  async findById(id: string): Promise<Match | null> {
    return prisma.match.findUnique({ where: { id } });
  },

  async findByUsers(userAId: string, userBId: string): Promise<Match | null> {
    return prisma.match.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
  },

  async findActiveByUser(userId: string): Promise<Match[]> {
    return prisma.match.findMany({
      where: {
        status: 'active',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { score: 'desc' },
    });
  },

  async findByIdWithPartners(id: string): Promise<MatchWithPartners | null> {
    return prisma.match.findUnique({
      where: { id },
      include: { userA: true, userB: true },
    });
  },

  async findActiveByUserWithPartners(userId: string): Promise<MatchWithPartners[]> {
    return prisma.match.findMany({
      where: {
        status: 'active',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: { userA: true, userB: true },
      orderBy: { score: 'desc' },
    });
  },

  // Returns all matches (any status) for userId that have at least one message,
  // with both partners and the last message included, sorted by last message desc.
  async findWithLastMessageByUser(userId: string): Promise<MatchWithPartnersAndMessages[]> {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        messages: { some: {} },
      },
      include: {
        userA: true,
        userB: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    return matches.sort((a, b) => {
      const aTime = a.messages[0]?.createdAt.getTime() ?? 0;
      const bTime = b.messages[0]?.createdAt.getTime() ?? 0;
      return bTime - aTime;
    });
  },

  async updateStatus(id: string, status: MatchStatus): Promise<Match> {
    return prisma.match.update({ where: { id }, data: { status } });
  },

  // Batch-marks active matches as inactive when either participant's lastSeenAt
  // is before cutoffDate. Uses two-step (findMany + updateMany) because Prisma
  // updateMany does not support relation filters in its where clause.
  async markInactiveByLastSeen(cutoffDate: Date): Promise<number> {
    const stale = await prisma.match.findMany({
      where: {
        status: 'active',
        OR: [
          { userA: { lastSeenAt: { lt: cutoffDate } } },
          { userB: { lastSeenAt: { lt: cutoffDate } } },
        ],
      },
      select: { id: true },
    });

    if (stale.length === 0) return 0;

    const result = await prisma.match.updateMany({
      where: { id: { in: stale.map((m) => m.id) } },
      data: { status: 'inactive' },
    });

    return result.count;
  },
};
