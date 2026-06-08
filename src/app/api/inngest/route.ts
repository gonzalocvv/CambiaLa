import { serve } from 'inngest/next';

import { inngest } from '@/inngest/client';
import { digestMatchesFn } from '@/inngest/functions/digest-matches';
import { matchRecomputeFn } from '@/inngest/functions/match-recompute';
import { notificationEmailFn } from '@/inngest/functions/notification-email';

// RF-307: endpoint que registra las funciones de Inngest con la plataforma.
// Inngest llama GET para sync y POST para ejecutar funciones.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [matchRecomputeFn, notificationEmailFn, digestMatchesFn],
});
