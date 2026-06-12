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

  async countUnread(matchId: string, userId: string): Promise<number> {
    return prisma.message.count({
      where: {
        matchId,
        fromUserId: { not: userId },
        readAt: null,
      },
    });
  },

  async markMessagesRead(matchId: string, userId: string): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        matchId,
        fromUserId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return result.count;
  },
};
