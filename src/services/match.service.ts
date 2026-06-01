import type { Match } from '@prisma/client';

import type { MatchResult } from '@/types/match';
import type { ActiveMatchItem, MatchStatus } from '@/lib/validations/match.schema';
import { matchRepository } from '@/repositories/match.repository';

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
    const saved = await matchRepository.upsert(input);
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

  // Returns matches with partner data normalised to the requesting user's perspective.
  async getActiveMatchesWithPartners(userId: string): Promise<ActiveMatchItem[]> {
    const matches = await matchRepository.findActiveByUserWithPartners(userId);
    return matches.map((m) => {
      const isA = m.userAId === userId;
      const partner = isA ? m.userB : m.userA;
      return {
        id: m.id,
        score: m.score,
        status: m.status as MatchStatus,
        youGive: isA ? (m.aToB as string[]) : (m.bToA as string[]),
        youGet: isA ? (m.bToA as string[]) : (m.aToB as string[]),
        partner: {
          id: partner.id,
          username: partner.username,
          name: partner.name,
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
