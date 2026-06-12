import { z } from 'zod';

import { URUGUAY_DEPARTMENTS } from '@/lib/locations';

// RF-1102: límites del banner. Validados en el endpoint/storage ANTES de subir.
export const BANNER_MAX_BYTES = 2 * 1024 * 1024; // ~2MB
export const BANNER_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type BannerMime = (typeof BANNER_ALLOWED_MIME)[number];

export const DepartmentSchema = z.enum(URUGUAY_DEPARTMENTS);

// Campos base de una actividad (sin refines, para poder derivar create/update).
const activityFields = {
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(120).optional(),
  department: DepartmentSchema,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
};

// endsAt, si viene, tiene que ser posterior a startsAt.
function endsAfterStarts(data: { startsAt?: Date; endsAt?: Date }): boolean {
  if (!data.startsAt || !data.endsAt) return true;
  return data.endsAt > data.startsAt;
}
const endsAfterStartsIssue = {
  message: 'endsAt debe ser posterior a startsAt',
  path: ['endsAt'] as const,
};

export const CreateActivitySchema = z
  .object(activityFields)
  .refine(endsAfterStarts, endsAfterStartsIssue);
export type CreateActivityInput = z.infer<typeof CreateActivitySchema>;

export const UpdateActivitySchema = z
  .object(activityFields)
  .partial()
  .refine(endsAfterStarts, endsAfterStartsIssue);
export type UpdateActivityInput = z.infer<typeof UpdateActivitySchema>;

export const ListActivitiesQuerySchema = z.object({
  department: DepartmentSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListActivitiesQuery = z.infer<typeof ListActivitiesQuerySchema>;

// DTOs de salida (fechas como ISO string para serializar a JSON).
export const ActivityItemSchema = z.object({
  id: z.string(),
  albumId: z.string(),
  department: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  isPublished: z.boolean(),
  createdById: z.string(),
  createdAt: z.string().datetime(),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const ActivityDetailSchema = ActivityItemSchema.extend({
  author: z
    .object({
      username: z.string().nullable(),
      name: z.string().nullable(),
    })
    .nullable(),
});
export type ActivityDetail = z.infer<typeof ActivityDetailSchema>;

export const ListActivitiesResponseSchema = z.object({
  activities: z.array(ActivityItemSchema),
  total: z.number().int(),
  department: z.string().nullable(),
});
export type ListActivitiesResponse = z.infer<typeof ListActivitiesResponseSchema>;
