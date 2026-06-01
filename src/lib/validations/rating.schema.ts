import { z } from 'zod';

export const RatingStarsSchema = z.number().int().min(1).max(5);

export const CreateRatingSchema = z.object({
  stars: RatingStarsSchema,
  comment: z.string().max(200).optional(),
});

export const RatingItemSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  raterId: z.string(),
  ratedId: z.string(),
  stars: RatingStarsSchema,
  comment: z.string().nullable(),
  createdAt: z.string(),
});

export const GetRatingsResponseSchema = z.object({
  ratings: z.array(RatingItemSchema),
  hasRated: z.boolean(),
});

export const CreateRatingResponseSchema = z.object({
  rating: RatingItemSchema,
});

export type CreateRating = z.infer<typeof CreateRatingSchema>;
export type RatingItem = z.infer<typeof RatingItemSchema>;
export type GetRatingsResponse = z.infer<typeof GetRatingsResponseSchema>;
