import { z } from 'zod';

export const MatchStatusSchema = z.enum(['active', 'inactive', 'trading', 'completed']);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const UpsertMatchSchema = z.object({
  userAId: z.string().min(1),
  userBId: z.string().min(1),
  aToB: z.array(z.string()),
  bToA: z.array(z.string()),
  score: z.number().int().min(1),
});
export type UpsertMatchInput = z.infer<typeof UpsertMatchSchema>;

export const UpdateMatchStatusSchema = z.object({
  status: MatchStatusSchema,
});
export type UpdateMatchStatusInput = z.infer<typeof UpdateMatchStatusSchema>;

// Response schemas for GET /api/matches
export const MatchPartnerSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  neighborhood: z.string().nullable(),
  city: z.string().nullable(),
  reputation: z.number(),
  tradesCompleted: z.number().int(),
});
export type MatchPartner = z.infer<typeof MatchPartnerSchema>;

export const ActiveMatchItemSchema = z.object({
  id: z.string(),
  score: z.number().int().min(1),
  status: MatchStatusSchema,
  youGive: z.array(z.string()),
  youGet: z.array(z.string()),
  partner: MatchPartnerSchema,
  createdAt: z.string().datetime(),
  lastUpdated: z.string().datetime(),
});
export type ActiveMatchItem = z.infer<typeof ActiveMatchItemSchema>;

export const GetMatchesResponseSchema = z.object({
  matches: z.array(ActiveMatchItemSchema),
});
export type GetMatchesResponse = z.infer<typeof GetMatchesResponseSchema>;

export const GetMatchDetailResponseSchema = z.object({
  match: ActiveMatchItemSchema,
});
export type GetMatchDetailResponse = z.infer<typeof GetMatchDetailResponseSchema>;
