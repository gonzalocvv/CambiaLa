import { logger } from '@/lib/logger';
import { inngest } from '@/inngest/client';
import { notificationService } from '@/services/notification.service';

// RF-307: digest diario (cada mañana) y semanal (solo lunes).
// El lunes se envían AMBOS: primero los diarios, luego los semanales.
export async function handleDigestMatches(
  now: Date = new Date(),
): Promise<{ frequencies: string[]; sent: number; skipped?: true }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    logger.warn('digest skipped: NEXT_PUBLIC_BASE_URL not set');
    return { frequencies: [], sent: 0, skipped: true };
  }

  const frequencies: string[] = ['daily'];
  // getDay() → 0=Dom, 1=Lun … 6=Sáb. Weekly solo los lunes.
  if (now.getDay() === 1) frequencies.push('weekly');

  let totalSent = 0;
  for (const freq of frequencies as ('daily' | 'weekly')[]) {
    const { sent } = await notificationService.sendMatchDigest(freq, baseUrl);
    totalSent += sent;
  }

  return { frequencies, sent: totalSent };
}

// Cron: cada día a las 9:00 UTC. El lunes también dispara el weekly.
export const digestMatchesFn = inngest.createFunction(
  { id: 'digest-matches', name: 'Match Digest (daily/weekly)', triggers: [{ cron: '0 9 * * *' }] },
  async () => handleDigestMatches(),
);
