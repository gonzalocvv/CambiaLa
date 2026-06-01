import type { Message } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export const messageRepository = {
  async create(matchId: string, fromUserId: string, body: string): Promise<Message> {
    return prisma.message.create({
      data: { matchId, fromUserId, body },
    });
  },

  async findByMatch(matchId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
    });
  },

  async countByMatch(matchId: string): Promise<number> {
    return prisma.message.count({ where: { matchId } });
  },
};
