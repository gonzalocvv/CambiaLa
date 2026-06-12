import { inngest } from '@/inngest/client';
import { matchService } from '@/services/match.service';

// RF-309: marca inactive los matches de pares con >30 días de inactividad.
export async function handleCleanupMatches(inactiveDays = 30): Promise<{ marked: number }> {
  const marked = await matchService.cleanupExpiredMatches(inactiveDays);
  return { marked };
}

// Cron: cada día a las 3:00 UTC (antes del digest de las 9am).
export const cleanupMatchesFn = inngest.createFunction(
  { id: 'cleanup-matches', name: 'Match TTL Cleanup (daily)', triggers: [{ cron: '0 3 * * *' }] },
  async () => handleCleanupMatches(),
);
