import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'new_match',
  'new_message',
  'trade_completed',
  'rating_received',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationItemSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationItem = z.infer<typeof NotificationItemSchema>;

export const GetNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type GetNotificationsQuery = z.infer<typeof GetNotificationsQuerySchema>;

export const GetNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationItemSchema),
  total: z.number().int(),
  unreadCount: z.number().int(),
});
export type GetNotificationsResponse = z.infer<typeof GetNotificationsResponseSchema>;

export const CreateNotificationSchema = z.object({
  userId: z.string().min(1),
  type: NotificationTypeSchema,
  payload: z.record(z.string(), z.unknown()),
});
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
