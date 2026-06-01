import { z } from 'zod';
import { URUGUAY_DEPARTMENTS, MONTEVIDEO_NEIGHBORHOODS } from '@/lib/locations';

export const UsernameSchema = z
  .string()
  .min(3, 'Mínimo 3 caracteres')
  .max(20, 'Máximo 20 caracteres')
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo');

export const CompleteOnboardingSchema = z
  .object({
    username: UsernameSchema,
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

export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;

export const CheckUsernameQuerySchema = z.object({
  username: UsernameSchema,
});

export const CheckUsernameResponseSchema = z.object({
  available: z.boolean(),
});

export const CompleteOnboardingResponseSchema = z.object({
  ok: z.literal(true),
});
