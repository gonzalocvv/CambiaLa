import type { Notification } from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';

import { prisma } from '@/lib/prisma';

export const notificationRepository = {
  async create(data: {
    userId: string;
    type: string;
    payload: Record<string, unknown>;
  }): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        payload: data.payload as InputJsonValue,
      },
    });
  },

  async findByUserId(userId: string, skip: number, take: number): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  async countByUserId(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId } });
  },

  async countUnreadByUserId(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({ where: { id } });
  },

  async markRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  },
};
