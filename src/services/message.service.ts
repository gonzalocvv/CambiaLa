import type { Message } from '@prisma/client';

import type { ConversationItem, MessageItem } from '@/lib/validations/message.schema';
import type { MatchStatus } from '@/lib/validations/match.schema';
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

  async getConversationsForUser(userId: string): Promise<ConversationItem[]> {
    const matches = await matchRepository.findWithLastMessageByUser(userId);
    const unreadCounts = await Promise.all(
      matches.map((m) => messageRepository.countUnread(m.id, userId)),
    );
    return matches.map((m, i) => {
      const isA = m.userAId === userId;
      const partner = isA ? m.userB : m.userA;
      const lastMsg = m.messages[0];
      return {
        matchId: m.id,
        status: m.status as MatchStatus,
        partner: {
          id: partner.id,
          username: partner.username,
          name: partner.name,
          bio: partner.bio,
          avatarUrl: partner.avatarUrl,
          neighborhood: partner.neighborhood,
          city: partner.city,
          reputation: partner.reputation,
          tradesCompleted: partner.tradesCompleted,
        },
        lastMessage: {
          id: lastMsg.id,
          body: lastMsg.body,
          createdAt: lastMsg.createdAt.toISOString(),
          fromUserId: lastMsg.fromUserId,
          isMine: lastMsg.fromUserId === userId,
        },
        unreadCount: unreadCounts[i],
      };
    });
  },
};
