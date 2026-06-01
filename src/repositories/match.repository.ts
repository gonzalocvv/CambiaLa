import type { Match } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { MatchStatus, UpsertMatchInput } from '@/lib/validations/match.schema';

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

  async updateStatus(id: string, status: MatchStatus): Promise<Match> {
    return prisma.match.update({ where: { id }, data: { status } });
  },
};
