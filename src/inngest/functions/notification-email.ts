import { inngest } from '@/inngest/client';
import { notificationService } from '@/services/notification.service';

// RF-307: mueve el envío de email fuera del hot path de createNotification.
// El evento 'notification/email' llega con los datos de la notificación;
// la función delega en maybeSendEmail (que controla emailFrequency y Resend).
export async function handleNotificationEmail({
  userId,
  type,
  payload,
}: {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  await notificationService.maybeSendEmail(userId, type, payload);
}

export const notificationEmailFn = inngest.createFunction(
  {
    id: 'notification-email',
    name: 'Notification Email',
    triggers: [{ event: 'notification/email' }],
  },
  async ({ event }) =>
    handleNotificationEmail(
      event.data as { userId: string; type: string; payload: Record<string, unknown> },
    ),
);
