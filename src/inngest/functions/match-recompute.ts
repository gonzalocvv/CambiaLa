import { inngest } from '@/inngest/client';
import { matchService } from '@/services/match.service';

// RF-307: mueve el recompute de matches fuera del hot path del PATCH del álbum.
// Al encolar el evento 'match/recompute', el request responde de inmediato y
// Inngest ejecuta la función de forma asíncrona con reintentos automáticos.
export async function handleMatchRecompute({ userId }: { userId: string }) {
  return matchService.recomputeForUser(userId);
}

export const matchRecomputeFn = inngest.createFunction(
  { id: 'match-recompute', name: 'Match Recompute', triggers: [{ event: 'match/recompute' }] },
  async ({ event }) => handleMatchRecompute(event.data as { userId: string }),
);
