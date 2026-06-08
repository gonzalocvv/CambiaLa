import { Prisma, type Match } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { MatchStatus, UpsertMatchInput } from '@/lib/validations/match.schema';
import type { MatchmakingCandidate, MatchmakingProfile } from '@/types/match';

// RF-320: solo cargamos las figus con count >= 1 (las que el usuario puede ofrecer
// o ya tiene). Las ausentes/count 0 las infiere el engine como "necesita". Filtrar
// acá es una optimización de storage, no cambia el resultado del match.
const OFFERABLE_STICKERS = {
  where: { count: { gte: 1 } },
  select: { count: true, sticker: { select: { number: true } } },
} as const;

export type MatchWithPartners = Prisma.MatchGetPayload<{
  include: { userA: true; userB: true };
}>;

export type MatchWithPartnersAndMessages = Prisma.MatchGetPayload<{
  include: { userA: true; userB: true; messages: true };
}>;

// RF-320: estados terminales del match — el recompute NO debe resucitarlos.
// Una vez que el cambio se completó o está en negociación, un recálculo posterior
// (gatillado por cualquiera de las partes al editar su álbum) debe dejarlos quietos.
const NON_TERMINAL_STATUSES = ['active', 'inactive'] as const;

export const matchRepository = {
  // RF-320 + RF-308: persiste un match con detección de novedad race-safe.
  // Insertamos primero: si entra ⇒ match nuevo (`created: true`, dispara new_match).
  // Si choca con el @@unique([userAId, userBId]) (P2002) ⇒ el par ya existía: lo
  // reactivamos SOLO si está en estado no-terminal (active/inactive); 'completed'/'trading'
  // quedan intactos. Derivar la novedad del INSERT mata el TOCTOU de notificaciones
  // duplicadas cuando dos usuarios editan su álbum a la vez. En el camino de conflicto
  // no devolvemos la fila (el caller no la necesita) ⇒ una query menos.
  async upsert(data: UpsertMatchInput): Promise<{ match: Match | null; created: boolean }> {
    try {
      const match = await prisma.match.create({
        data: {
          userAId: data.userAId,
          userBId: data.userBId,
          aToB: data.aToB,
          bToA: data.bToA,
          score: data.score,
          status: 'active',
        },
      });
      return { match, created: true };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // updateMany permite acotar el write por estado (upsert/update no soportan
        // WHERE condicional sobre la fila). count 0 ⇒ el match estaba en estado terminal.
        await prisma.match.updateMany({
          where: {
            userAId: data.userAId,
            userBId: data.userBId,
            status: { in: [...NON_TERMINAL_STATUSES] },
          },
          data: {
            aToB: data.aToB,
            bToA: data.bToA,
            score: data.score,
            status: 'active',
          },
        });
        return { match: null, created: false };
      }
      throw err;
    }
  },

  async findById(id: string): Promise<Match | null> {
    return prisma.match.findUnique({ where: { id } });
  },

  async findByUsers(userAId: string, userBId: string): Promise<Match | null> {
    return prisma.match.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
  },

  async findActiveByUser(userId: string): Promise<Match[]> {
    return prisma.match.findMany({
      where: {
        status: 'active',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { score: 'desc' },
    });
  },

  async findByIdWithPartners(id: string): Promise<MatchWithPartners | null> {
    return prisma.match.findUnique({
      where: { id },
      include: { userA: true, userB: true },
    });
  },

  async findActiveByUserWithPartners(userId: string): Promise<MatchWithPartners[]> {
    return prisma.match.findMany({
      where: {
        status: 'active',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: { userA: true, userB: true },
      orderBy: { score: 'desc' },
    });
  },

  // Returns all matches (any status) for userId that have at least one message,
  // with both partners and the last message included, sorted by last message desc.
  async findWithLastMessageByUser(userId: string): Promise<MatchWithPartnersAndMessages[]> {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        messages: { some: {} },
      },
      include: {
        userA: true,
        userB: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    return matches.sort((a, b) => {
      const aTime = a.messages[0]?.createdAt.getTime() ?? 0;
      const bTime = b.messages[0]?.createdAt.getTime() ?? 0;
      return bTime - aTime;
    });
  },

  async updateStatus(id: string, status: MatchStatus): Promise<Match> {
    return prisma.match.update({ where: { id }, data: { status } });
  },

  // Batch-marks active matches as inactive when either participant's lastSeenAt
  // is before cutoffDate. Uses two-step (findMany + updateMany) because Prisma
  // updateMany does not support relation filters in its where clause.
  async markInactiveByLastSeen(cutoffDate: Date): Promise<number> {
    const stale = await prisma.match.findMany({
      where: {
        status: 'active',
        OR: [
          { userA: { lastSeenAt: { lt: cutoffDate } } },
          { userB: { lastSeenAt: { lt: cutoffDate } } },
        ],
      },
      select: { id: true },
    });

    if (stale.length === 0) return 0;

    const result = await prisma.match.updateMany({
      where: { id: { in: stale.map((m) => m.id) } },
      data: { status: 'inactive' },
    });

    return result.count;
  },

  // RF-342: después de un recompute, marca como inactive los matches active del usuario
  // cuyo contraparte NO está en freshPartnerIds (= dejaron de complementar). No toca
  // completed/trading — el filtro por status:'active' los preserva. Preserva el chat
  // (no borra la fila). Sigue el mismo patrón two-step de markInactiveByLastSeen.
  async pruneStaleForUser(userId: string, freshPartnerIds: string[]): Promise<number> {
    const stale = await prisma.match.findMany({
      where: {
        status: 'active',
        OR:
          freshPartnerIds.length > 0
            ? [
                { userAId: userId, userBId: { notIn: freshPartnerIds } },
                { userBId: userId, userAId: { notIn: freshPartnerIds } },
              ]
            : [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true },
    });

    if (stale.length === 0) return 0;

    const { count } = await prisma.match.updateMany({
      where: { id: { in: stale.map((m) => m.id) } },
      data: { status: 'inactive' },
    });

    return count;
  },

  // RF-320: carga el perfil de matchmaking del target + su set de figus ofrecibles.
  // `matchRadius` se devuelve crudo (String del schema); el service lo valida.
  async findMatchmakingProfile(userId: string): Promise<MatchmakingProfile | null> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        city: true,
        neighborhood: true,
        matchRadius: true,
        offerUniques: true,
        participatesInMatchmaking: true,
        isSuspended: true,
        notifyOnMatch: true,
        lastSeenAt: true,
        stickers: OFFERABLE_STICKERS,
      },
    });
    if (!u) return null;
    return {
      id: u.id,
      city: u.city,
      neighborhood: u.neighborhood,
      matchRadius: u.matchRadius,
      offerUniques: u.offerUniques,
      participatesInMatchmaking: u.participatesInMatchmaking,
      isSuspended: u.isSuspended,
      notifyOnMatch: u.notifyOnMatch,
      lastSeenAt: u.lastSeenAt,
      stickers: u.stickers.map((s) => ({ number: s.sticker.number, count: s.count })),
    };
  },

  // RF-320 + RF-302/303/304 + RF-318: pool de candidatos en UNA query (join a stickers
  // por relación → sin N+1). Filtra activos (<30d), opt-in, no suspendidos, excluye self.
  // `city` null ⇒ sin filtro de ciudad (radius 'country'); con city ⇒ mismo depto.
  // NO filtra por barrio: el fallback de barrio (RF-318) lo resuelve el engine.
  async findCandidatePool(
    targetUserId: string,
    { city, cutoffDate, take }: { city: string | null; cutoffDate: Date; take: number },
  ): Promise<MatchmakingCandidate[]> {
    const users = await prisma.user.findMany({
      where: {
        id: { not: targetUserId },
        participatesInMatchmaking: true,
        isSuspended: false,
        lastSeenAt: { gt: cutoffDate },
        ...(city ? { city } : {}),
      },
      select: {
        id: true,
        city: true,
        neighborhood: true,
        offerUniques: true,
        participatesInMatchmaking: true,
        notifyOnMatch: true,
        lastSeenAt: true,
        stickers: OFFERABLE_STICKERS,
      },
      // RF-320: el LIMIT vive en la query (no en JS) para no traer todo el padrón a
      // memoria. orderBy determinista (más activos primero) ⇒ la truncación deja de
      // ser arbitraria: si hay que recortar, se priorizan los candidatos más recientes.
      orderBy: { lastSeenAt: 'desc' },
      take,
    });
    return users.map((u) => ({
      id: u.id,
      city: u.city,
      neighborhood: u.neighborhood,
      offerUniques: u.offerUniques,
      participatesInMatchmaking: u.participatesInMatchmaking,
      notifyOnMatch: u.notifyOnMatch,
      lastSeenAt: u.lastSeenAt,
      stickers: u.stickers.map((s) => ({ number: s.sticker.number, count: s.count })),
    }));
  },
};
