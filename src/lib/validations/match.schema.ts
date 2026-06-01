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
