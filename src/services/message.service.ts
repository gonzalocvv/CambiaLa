import type { Message } from '@prisma/client';

import type { MessageItem } from '@/lib/validations/message.schema';
import { matchRepository } from '@/repositories/match.repository';
import { messageRepository } from '@/repositories/message.repository';

export class MessageAccessError extends Error {
  constructor() {
    super('Not a participant of this match');
  }
}

export class MatchNotFoundError extends Error {
  constructor() {
    super('Match not found');
  }
}

function toMessageItem(m: Message): MessageItem {
  return {
    id: m.id,
    matchId: m.matchId,
    fromUserId: m.fromUserId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  };
}

async function assertParticipant(matchId: string, userId: string): Promise<void> {
  const match = await matchRepository.findById(matchId);
  if (!match) throw new MatchNotFoundError();
  if (match.userAId !== userId && match.userBId !== userId) throw new MessageAccessError();
}

export const messageService = {
  async getMessages(matchId: string, userId: string): Promise<MessageItem[]> {
    await assertParticipant(matchId, userId);
    const messages = await messageRepository.findByMatch(matchId);
    return messages.map(toMessageItem);
  },

  async sendMessage(matchId: string, fromUserId: string, body: string): Promise<MessageItem> {
    await assertParticipant(matchId, fromUserId);
    const message = await messageRepository.create(matchId, fromUserId, body);
    return toMessageItem(message);
  },
};
