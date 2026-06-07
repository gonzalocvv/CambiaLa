import type { Match } from '@prisma/client';

import type {
  MatchmakingCandidate,
  MatchmakingProfile,
  MatchRadius,
  MatchResult,
  UserCollectionInput,
} from '@/types/match';
import type { ActiveMatchItem, MatchStatus } from '@/lib/validations/match.schema';
import { ACTIVE_DAYS_DEFAULT, findMatchesForUser } from '@/lib/match-engine';
import { logger } from '@/lib/logger';
import { matchRepository } from '@/repositories/match.repository';
import { messageRepository } from '@/repositories/message.repository';
import { notificationService } from '@/services/notification.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Ventana de actividad compartida con el engine (RF-303): una sola fuente de verdad
// para que el cutoff de la query SQL y el filtro del engine no se desincronicen.
const ACTIVE_DAYS = ACTIVE_DAYS_DEFAULT;
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
  // RF-308 + RF-409: persiste un match y notifica SOLO cuando es genuinamente nuevo.
  // La novedad la decide el repository por el INSERT (no por un read previo): así
  // dos recomputes concurrentes no disparan notificaciones duplicadas, y reactivar un
  // match inactivo no re-notifica. `notifyOnMatchByUser` gobierna por destinatario la
  // preferencia de settings (id ausente ⇒ true por defecto, no suprime). Devuelve solo
  // `created` porque el único caller (recomputeForUser) no necesita la fila.
  async saveMatchResult(
    result: MatchResult,
    notifyOnMatchByUser: Record<string, boolean> = {},
  ): Promise<{ created: boolean }> {
    const input = toUpsertInput(result);
    const { match: saved, created } = await matchRepository.upsert(input);
    if (created && saved) {
      const recipients = [input.userAId, input.userBId].filter(
        (id) => notifyOnMatchByUser[id] !== false,
      );
      try {
        await Promise.all(
          recipients.map((id) =>
            notificationService.createNotification(id, 'new_match', {
              matchId: saved.id,
              score: saved.score,
            }),
          ),
        );
      } catch {
        // Notification failure must not fail the match save
      }
    }
    return { created };
  },

  // RF-320 + RF-318: recalcula los matches del usuario tras un cambio de álbum y los
  // persiste (upsert idempotente + notificación new_match en match nuevo, vía saveMatchResult).
  // Síncrono por diseño (sin Inngest — eso es RF-307). El engine queda puro: el pool
  // y el perfil se cargan en el repository; acá solo se orquesta. `now` es inyectable
  // para tests deterministas: alimenta tanto el cutoff de actividad como el engine.
  async recomputeForUser(userId: string, now: Date = new Date()): Promise<{ matched: number }> {
    const target = await matchRepository.findMatchmakingProfile(userId);
    // Un target inexistente, suspendido o que optó por salir del matchmaking no genera
    // matches (el pool ya excluye suspendidos; acá cubrimos al iniciador del recompute).
    if (!target || target.isSuspended || !target.participatesInMatchmaking) return { matched: 0 };

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
    // El LIMIT lo aplica la query (take). El slice de abajo queda como red de seguridad.
    let pool = await matchRepository.findCandidatePool(userId, {
      city,
      cutoffDate,
      take: MAX_POOL_SIZE,
    });

    if (pool.length > MAX_POOL_SIZE) {
      logger.warn('recompute: candidate pool truncated', {
        userId,
        poolSize: pool.length,
        max: MAX_POOL_SIZE,
      });
      pool = pool.slice(0, MAX_POOL_SIZE);
    }

    // RF-409: preferencia new_match por destinatario (target + cada candidato del pool).
    const notifyOnMatchByUser: Record<string, boolean> = { [target.id]: target.notifyOnMatch };
    for (const candidate of pool) notifyOnMatchByUser[candidate.id] = candidate.notifyOnMatch;

    const results = findMatchesForUser(toCollectionInput(target), pool.map(toCollectionInput), {
      radius,
      activeDays: ACTIVE_DAYS,
      now,
    });

    let persisted = 0;
    try {
      for (const result of results) {
        await this.saveMatchResult(result, notifyOnMatchByUser);
        persisted += 1;
      }
    } catch (error) {
      // upsert idempotente ⇒ reintentar es seguro. Reportamos cuántos se persistieron
      // de verdad antes del fallo y re-lanzamos: el caller (sticker.service) lo atrapa
      // para no romper el guardado del álbum.
      logger.error('recompute: partial match persistence failed', {
        userId,
        persisted,
        total: results.length,
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
