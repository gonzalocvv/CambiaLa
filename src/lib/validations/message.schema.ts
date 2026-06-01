import { z } from 'zod';

import { MatchPartnerSchema, MatchStatusSchema } from '@/lib/validations/match.schema';

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

export const ConversationLastMessageSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
  fromUserId: z.string(),
  isMine: z.boolean(),
});
export type ConversationLastMessage = z.infer<typeof ConversationLastMessageSchema>;

export const ConversationItemSchema = z.object({
  matchId: z.string(),
  status: MatchStatusSchema,
  partner: MatchPartnerSchema,
  lastMessage: ConversationLastMessageSchema,
  unreadCount: z.number().int().min(0),
});
export type ConversationItem = z.infer<typeof ConversationItemSchema>;

export const GetConversationsResponseSchema = z.object({
  conversations: z.array(ConversationItemSchema),
});
export type GetConversationsResponse = z.infer<typeof GetConversationsResponseSchema>;
