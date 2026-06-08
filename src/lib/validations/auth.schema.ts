import { z } from 'zod';

export const VerifyOtpSchema = z.object({
  email: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.string().email()),
  token: z
    .string()
    .transform((s) => s.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{6}$/, 'El código debe tener exactamente 6 dígitos numéricos')),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
