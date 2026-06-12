import { z } from 'zod';

export const ListUsersQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const SuspendUserSchema = z.object({
  isSuspended: z.boolean(),
});
export type SuspendUserInput = z.infer<typeof SuspendUserSchema>;
