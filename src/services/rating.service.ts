import type { Rating } from '@prisma/client';

import type { RatingItem } from '@/lib/validations/rating.schema';
import { logger } from '@/lib/logger';
import { matchRepository } from '@/repositories/match.repository';
import { ratingRepository } from '@/repositories/rating.repository';
import { userRepository } from '@/repositories/user.repository';
import { notificationService } from '@/services/notification.service';

export class RatingMatchNotFoundError extends Error {
  constructor() {
    super('Match not found or user is not a participant');
  }
}

export class RatingNotCompletedError extends Error {
  constructor() {
    super('Match must be completed before rating');
  }
}

export class AlreadyRatedError extends Error {
  constructor() {
    super('Already rated this match');
  }
}

function toRatingItem(r: Rating): RatingItem {
  return {
    id: r.id,
    matchId: r.matchId,
    raterId: r.raterId,
    ratedId: r.ratedId,
    stars: r.stars,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  };
}

export const ratingService = {
  async createRating(
    matchId: string,
    raterId: string,
    stars: number,
    comment?: string,
  ): Promise<RatingItem> {
    const match = await matchRepository.findById(matchId);
    if (!match || (match.userAId !== raterId && match.userBId !== raterId)) {
      throw new RatingMatchNotFoundError();
    }
    if (match.status !== 'completed') {
      throw new RatingNotCompletedError();
    }

    const existing = await ratingRepository.findByRater(matchId, raterId);
    if (existing) throw new AlreadyRatedError();

    const ratedId = match.userAId === raterId ? match.userBId : match.userAId;
    const rating = await ratingRepository.create(matchId, raterId, ratedId, stars, comment);

    // RF-603: update denormalized reputation for the rated user
    const stats = await ratingRepository.getReputationStats(ratedId);
    await userRepository.updateReputation(ratedId, {
      reputation: stats.avg,
      tradesCompleted: stats.count,
    });

    // RF-409/RF-406: notificar (in-app + email) al reseñado. En try/catch: una
    // notificación fallida no debe romper el alta de la reseña ya persistida.
    try {
      await notificationService.createNotification(ratedId, 'rating_received', {
        matchId,
        ratingId: rating.id,
        stars,
      });
    } catch (error) {
      logger.error('rating notification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return toRatingItem(rating);
  },

  async getRatingsForMatch(
    matchId: string,
    userId: string,
  ): Promise<{ ratings: RatingItem[]; hasRated: boolean }> {
    const match = await matchRepository.findById(matchId);
    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new RatingMatchNotFoundError();
    }

    const [ratings, existing] = await Promise.all([
      ratingRepository.findByMatch(matchId),
      ratingRepository.findByRater(matchId, userId),
    ]);

    return {
      ratings: ratings.map(toRatingItem),
      hasRated: existing !== null,
    };
  },
};
