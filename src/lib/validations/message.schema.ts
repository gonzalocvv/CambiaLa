import { z } from 'zod';

export const MessageItemSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  fromUserId: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
  readAt: z.string().datetime().nullable(),
});
export type MessageItem = z.infer<typeof MessageItemSchema>;

export const SendMessageSchema = z.object({
  body: z.string().min(1, 'El mensaje no puede estar vacío').max(1000, 'Máximo 1000 caracteres'),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const GetMessagesResponseSchema = z.object({
  messages: z.array(MessageItemSchema),
});
export type GetMessagesResponse = z.infer<typeof GetMessagesResponseSchema>;

export const SendMessageResponseSchema = z.object({
  message: MessageItemSchema,
});
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
