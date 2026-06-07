import type { Match } from '@prisma/client';

import type {
  MatchmakingCandidate,
  MatchmakingProfile,
  MatchRadius,
  MatchResult,
  UserCollectionInput,
} from '@/types/match';
import type { ActiveMatchItem, MatchStatus } from '@/lib/validations/match.schema';
import { findMatchesForUser } from '@/lib/match-engine';
import { logger } from '@/lib/logger';
import { matchRepository } from '@/repositories/match.repository';
import { messageRepository } from '@/repositories/message.repository';
import { notificationService } from '@/services/notification.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ACTIVE_DAYS = 30;
const VALID_RADII: readonly MatchRadius[] = ['neighborhood', 'department', 'country'];

// RF-320: tope defensivo del pool síncrono dentro del PATCH (placeholder, tunear tras
// un test de capacidad). Recompute pesado real → RF-307/Inngest. Exportado para tests.
export const MAX_POOL_SIZE = 5000;

// Typed view of a Match record with decoded JSON arrays.
export type MatchRecord = Omit<Match, 'aToB' | 'bToA'> & {
  aToB: string[];
  bToA: string[];
};

// Adapta un perfil/candidato de matchmaking al input puro del engine.
function toCollectionInput(p: MatchmakingProfile | MatchmakingCandidate): UserCollectionInput {
  return {
    userId: p.id,
    stickers: p.stickers,
    offerUniques: p.offerUniques,
    city: p.city,
    neighborhood: p.neighborhood,
    lastSeenAt: p.lastSeenAt,
    participatesInMatchmaking: p.participatesInMatchmaking,
  };
}

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

  // RF-320 + RF-318: recalcula los matches del usuario tras un cambio de álbum y los
  // persiste (upsert idempotente + notificación new_match en match nuevo, vía saveMatchResult).
  // Síncrono por diseño (sin Inngest — eso es RF-307). El engine queda puro: el pool
  // y el perfil se cargan en el repository; acá solo se orquesta. `now` es inyectable
  // para tests deterministas: alimenta tanto el cutoff de actividad como el engine.
  async recomputeForUser(userId: string, now: Date = new Date()): Promise<{ matched: number }> {
    const target = await matchRepository.findMatchmakingProfile(userId);
    if (!target || !target.participatesInMatchmaking) return { matched: 0 };

    if (!VALID_RADII.includes(target.matchRadius as MatchRadius)) {
      logger.warn('recompute: invalid matchRadius', { userId, radius: target.matchRadius });
      return { matched: 0 };
    }
    const radius = target.matchRadius as MatchRadius;

    // Scope del pool espejando isSameLocation: 'country' ⇒ sin filtro de ciudad;
    // 'department'/'neighborhood' ⇒ misma ciudad. Sin ciudad y radius local ⇒ el engine
    // rechazaría a todos, así que cortamos antes de cargar el pool.
    let city: string | null;
    if (radius === 'country') {
      city = null;
    } else {
      if (!target.city) return { matched: 0 };
      city = target.city;
    }

    const cutoffDate = new Date(now.getTime() - ACTIVE_DAYS * MS_PER_DAY);
    let pool = await matchRepository.findCandidatePool(userId, { city, cutoffDate });

    if (pool.length > MAX_POOL_SIZE) {
      logger.warn('recompute: candidate pool truncated', {
        userId,
        poolSize: pool.length,
        max: MAX_POOL_SIZE,
      });
      pool = pool.slice(0, MAX_POOL_SIZE);
    }

    const results = findMatchesForUser(toCollectionInput(target), pool.map(toCollectionInput), {
      radius,
      activeDays: ACTIVE_DAYS,
      now,
    });

    try {
      for (const result of results) {
        await this.saveMatchResult(result);
      }
    } catch (error) {
      // Upsert idempotente ⇒ reintentar es seguro. Reportamos cuántos se intentaban y
      // re-lanzamos: el caller (sticker.service) lo atrapa para no romper el guardado del álbum.
      logger.error('recompute: partial match persistence failed', {
        userId,
        attempted: results.length,
        error,
      });
      throw error;
    }

    return { matched: results.length };
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
