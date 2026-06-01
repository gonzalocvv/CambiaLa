import type { Notification } from '@prisma/client';

import type { NotificationItem } from '@/lib/validations/notification.schema';
import { notificationRepository } from '@/repositories/notification.repository';

function toNotificationItem(n: Notification): NotificationItem {
  return {
    id: n.id,
    type: n.type as NotificationItem['type'],
    payload: n.payload as Record<string, unknown>,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

export const notificationService = {
  async createNotification(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<NotificationItem> {
    const notification = await notificationRepository.create({ userId, type, payload });
    return toNotificationItem(notification);
  },

  async getNotificationsForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ notifications: NotificationItem[]; total: number; unreadCount: number }> {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      notificationRepository.findByUserId(userId, skip, limit),
      notificationRepository.countByUserId(userId),
      notificationRepository.countUnreadByUserId(userId),
    ]);
    return {
      notifications: notifications.map(toNotificationItem),
      total,
      unreadCount,
    };
  },

  // Returns null if notification not found or doesn't belong to user.
  // Idempotent: already-read notifications return current state without updating.
  async markNotificationRead(id: string, userId: string): Promise<NotificationItem | null> {
    const notification = await notificationRepository.findById(id);
    if (!notification || notification.userId !== userId) return null;
    if (notification.readAt) return toNotificationItem(notification);
    const updated = await notificationRepository.markRead(id);
    return toNotificationItem(updated);
  },
};
