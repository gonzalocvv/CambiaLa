import { z } from 'zod';
import { URUGUAY_DEPARTMENTS, MONTEVIDEO_NEIGHBORHOODS } from '@/lib/locations';

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Ingresá tu nombre')
    .max(50, 'Máximo 50 caracteres')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(140, 'Máximo 140 caracteres').optional().or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const UpdateLocationSchema = z
  .object({
    city: z.enum(URUGUAY_DEPARTMENTS),
    neighborhood: z.enum(MONTEVIDEO_NEIGHBORHOODS).optional(),
  })
  .refine(
    (data) => {
      if (data.city === 'Montevideo') return data.neighborhood !== undefined;
      return true;
    },
    { message: 'Elegí tu barrio', path: ['neighborhood'] },
  );

export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;

export const GetSettingsResponseSchema = z.object({
  username: z.string().nullable(),
  name: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  city: z.string().nullable(),
  neighborhood: z.string().nullable(),
});

export type GetSettingsResponse = z.infer<typeof GetSettingsResponseSchema>;
