import type { Match } from '@prisma/client';

import type { MatchResult } from '@/types/match';
import type { ActiveMatchItem, MatchStatus } from '@/lib/validations/match.schema';
import { matchRepository } from '@/repositories/match.repository';
import { messageRepository } from '@/repositories/message.repository';
import { notificationService } from '@/services/notification.service';

// Typed view of a Match record with decoded JSON arrays.
export type MatchRecord = Omit<Match, 'aToB' | 'bToA'> & {
  aToB: string[];
  bToA: string[];
};

// Normalize ordering so [userAId, userBId] is always lexicographically sorted,
// guaranteeing the @@unique([userAId, userBId]) constraint is hit consistently
// regardless of which side triggered the computation.
function toUpsertInput(result: MatchResult) {
  if (result.userAId <= result.userBId) {
    return {
      userAId: result.userAId,
      userBId: result.userBId,
      aToB: result.aToB,
      bToA: result.bToA,
      score: result.score,
    };
  }
  return {
    userAId: result.userBId,
    userBId: result.userAId,
    aToB: result.bToA,
    bToA: result.aToB,
    score: result.score,
  };
}

function decodeMatch(raw: Match): MatchRecord {
  return {
    ...raw,
    aToB: raw.aToB as string[],
    bToA: raw.bToA as string[],
  };
}

export const matchService = {
  async saveMatchResult(result: MatchResult): Promise<MatchRecord> {
    const input = toUpsertInput(result);
    const existing = await matchRepository.findByUsers(input.userAId, input.userBId);
    const saved = await matchRepository.upsert(input);
    if (!existing) {
      try {
        await Promise.all([
          notificationService.createNotification(input.userAId, 'new_match', {
            matchId: saved.id,
            score: saved.score,
          }),
          notificationService.createNotification(input.userBId, 'new_match', {
            matchId: saved.id,
            score: saved.score,
          }),
        ]);
      } catch {
        // Notification failure must not fail the match save
      }
    }
    return decodeMatch(saved);
  },

  async getMatchById(id: string): Promise<MatchRecord | null> {
    const match = await matchRepository.findById(id);
    return match ? decodeMatch(match) : null;
  },

  async getActiveMatchesForUser(userId: string): Promise<MatchRecord[]> {
    const matches = await matchRepository.findActiveByUser(userId);
    return matches.map(decodeMatch);
  },

  async completeMatch(id: string): Promise<MatchRecord> {
    const updated = await matchRepository.updateStatus(id, 'completed' as MatchStatus);
    return decodeMatch(updated);
  },

  async markMatchInactive(id: string): Promise<MatchRecord> {
    const updated = await matchRepository.updateStatus(id, 'inactive' as MatchStatus);
    return decodeMatch(updated);
  },

  async cleanupExpiredMatches(inactiveDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
    return matchRepository.markInactiveByLastSeen(cutoff);
  },

  // Returns a single match with partner data normalised to the requesting user's perspective.
  // Returns null if the match doesn't exist or the user is not a participant.
  async getMatchDetailForUser(id: string, userId: string): Promise<ActiveMatchItem | null> {
    const m = await matchRepository.findByIdWithPartners(id);
    if (!m) return null;
    if (m.userAId !== userId && m.userBId !== userId) return null;

    const isA = m.userAId === userId;
    const partner = isA ? m.userB : m.userA;
    return {
      id: m.id,
      score: m.score,
      status: m.status as MatchStatus,
      youGive: isA ? (m.aToB as string[]) : (m.bToA as string[]),
      youGet: isA ? (m.bToA as string[]) : (m.aToB as string[]),
      unreadCount: 0,
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
      createdAt: m.createdAt.toISOString(),
      lastUpdated: m.lastUpdated.toISOString(),
    };
  },

  // Returns matches with partner data normalised to the requesting user's perspective,
  // including the count of unread messages per match.
  async getActiveMatchesWithPartners(userId: string): Promise<ActiveMatchItem[]> {
    const matches = await matchRepository.findActiveByUserWithPartners(userId);
    const unreadCounts = await Promise.all(
      matches.map((m) => messageRepository.countUnread(m.id, userId)),
    );
    return matches.map((m, i) => {
      const isA = m.userAId === userId;
      const partner = isA ? m.userB : m.userA;
      return {
        id: m.id,
        score: m.score,
        status: m.status as MatchStatus,
        youGive: isA ? (m.aToB as string[]) : (m.bToA as string[]),
        youGet: isA ? (m.bToA as string[]) : (m.aToB as string[]),
        unreadCount: unreadCounts[i],
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
        createdAt: m.createdAt.toISOString(),
        lastUpdated: m.lastUpdated.toISOString(),
      };
    });
  },
};
