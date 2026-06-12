import { z } from 'zod';
import { URUGUAY_DEPARTMENTS, MONTEVIDEO_NEIGHBORHOODS } from '@/lib/locations';
import { normalizeUruguayanMobile } from '@/lib/phone';

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Ingresá tu nombre')
    .max(50, 'Máximo 50 caracteres')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(140, 'Máximo 140 caracteres').optional().or(z.literal('')),
  // Acepta el celular como lo escriba el usuario (099 123 456, +598..., etc.)
  // y lo guarda normalizado a +5989XXXXXXX.
  whatsapp: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? (normalizeUruguayanMobile(v) ?? v) : v),
    z
      .string()
      .regex(/^\+5989\d{7}$/, 'No parece un celular uruguayo. Probá: 099 123 456')
      .optional()
      .or(z.literal('')),
  ),
  publicProfile: z.boolean().optional(),
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

export const UpdateNotificationsSchema = z.object({
  notifyOnMatch: z.boolean().optional(),
  emailFrequency: z.enum(['instant', 'daily', 'weekly', 'never']).optional(),
  pushEnabled: z.boolean().optional(),
});

export type UpdateNotificationsInput = z.infer<typeof UpdateNotificationsSchema>;

export const UpdateMatchmakingSchema = z.object({
  participatesInMatchmaking: z.boolean().optional(),
  matchRadius: z.enum(['neighborhood', 'department', 'country']).optional(),
  offerUniques: z.boolean().optional(),
  acceptUnbalanced: z.boolean().optional(),
});

export type UpdateMatchmakingInput = z.infer<typeof UpdateMatchmakingSchema>;

export const GetSettingsResponseSchema = z.object({
  username: z.string().nullable(),
  name: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  city: z.string().nullable(),
  neighborhood: z.string().nullable(),
  whatsapp: z.string().nullable(),
  publicProfile: z.boolean(),
  notifyOnMatch: z.boolean(),
  emailFrequency: z.string(),
  pushEnabled: z.boolean(),
  participatesInMatchmaking: z.boolean(),
  matchRadius: z.string(),
  offerUniques: z.boolean(),
  acceptUnbalanced: z.boolean(),
});

export type GetSettingsResponse = z.infer<typeof GetSettingsResponseSchema>;
