import type { Rating } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export const ratingRepository = {
  async create(
    matchId: string,
    raterId: string,
    ratedId: string,
    stars: number,
    comment?: string,
  ): Promise<Rating> {
    return prisma.rating.create({
      data: { matchId, raterId, ratedId, stars, comment: comment ?? null },
    });
  },

  async findByMatch(matchId: string): Promise<Rating[]> {
    return prisma.rating.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findByRater(matchId: string, raterId: string): Promise<Rating | null> {
    return prisma.rating.findUnique({
      where: { matchId_raterId: { matchId, raterId } },
    });
  },

  async getReputationStats(ratedId: string): Promise<{ avg: number; count: number }> {
    const agg = await prisma.rating.aggregate({
      where: { ratedId },
      _avg: { stars: true },
      _count: { stars: true },
    });
    return {
      avg: agg._avg.stars ?? 0,
      count: agg._count.stars,
    };
  },
};
