import type { Notification } from '@prisma/client';

import { logger } from '@/lib/logger';
import {
  buildDigestEmail,
  buildNotificationEmail,
  EMAILABLE_NOTIFICATION_TYPES,
} from '@/lib/email/templates';
import { signUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import type { NotificationItem } from '@/lib/validations/notification.schema';
import { inngest } from '@/inngest/client';
import { notificationRepository } from '@/repositories/notification.repository';
import { userRepository } from '@/repositories/user.repository';
import { emailService } from '@/services/email.service';

// RF-406/407: tipos que disparan email. Fuente única en templates.ts (trade_completed se
// omite a propósito: no se crea hoy y buildNotificationEmail devuelve null para él).
const EMAILABLE_TYPES = new Set<string>(EMAILABLE_NOTIFICATION_TYPES);

function toNotificationItem(n: Notification): NotificationItem {
  return {
    id: n.id,
    type: n.type as NotificationItem['type'],
    payload: n.payload as Record<string, unknown>,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

// RF-406: arma la URL de destino del CTA por tipo, siempre con host de NEXT_PUBLIC_BASE_URL
// (nunca del payload) y segmentos dinámicos encodeados.
function ctaUrlFor(
  type: string,
  payload: Record<string, unknown>,
  recipient: { username: string | null },
  baseUrl: string,
): string {
  const matchId = typeof payload.matchId === 'string' ? payload.matchId : null;
  if (type === 'rating_received') {
    return recipient.username
      ? `${baseUrl}/u/${encodeURIComponent(recipient.username)}`
      : `${baseUrl}/matches`;
  }
  return matchId ? `${baseUrl}/matches/${encodeURIComponent(matchId)}` : `${baseUrl}/matches`;
}

export const notificationService = {
  async createNotification(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<NotificationItem> {
    // El in-app (la campanita) se crea SIEMPRE y primero.
    const notification = await notificationRepository.create({ userId, type, payload });
    // RF-307: el email se despacha async vía Inngest (fuera del hot path del request)
    // para evitar 504 por envíos lentos. La campanita ya está guardada: un fallo de
    // inngest.send no la pierde ni rompe el flujo que disparó la notificación.
    if (EMAILABLE_TYPES.has(type)) {
      await inngest
        .send({ name: 'notification/email', data: { userId, type, payload } })
        .catch((err: unknown) =>
          logger.error('inngest send notification/email failed', {
            userId,
            type,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
    }
    return toNotificationItem(notification);
  },

  // RF-406/407: side-effect de email. Gating: solo tipos emaileables; solo emailFrequency
  // 'instant' (never = off; daily/weekly = digest pendiente de RF-307, no se manda instant).
  // new_match además ya viene gateado por notifyOnMatch aguas arriba (saveMatchResult).
  // NUNCA lanza (try/catch + logger solo del mensaje, jamás secretos/token).
  async maybeSendEmail(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!EMAILABLE_TYPES.has(type)) return;
    try {
      const recipient = await userRepository.findEmailRecipient(userId);
      if (!recipient?.email) return;
      if (recipient.emailFrequency !== 'instant') return;

      // Sin base URL los links del mail quedarían relativos (no resuelven en el cliente).
      // Fail-safe: no mandar un mail con links rotos.
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      if (!baseUrl) {
        logger.warn('email skipped: NEXT_PUBLIC_BASE_URL not set', { userId, type });
        return;
      }
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(
        signUnsubscribeToken(userId),
      )}`;
      const ctaUrl = ctaUrlFor(type, payload, recipient, baseUrl);
      const email = buildNotificationEmail(type, {
        recipientName: recipient.name ?? recipient.username ?? null,
        payload,
        ctaUrl,
        unsubscribeUrl,
      });
      if (!email) return;

      await emailService.sendEmail({
        to: recipient.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch (error) {
      logger.error('notification email failed', {
        userId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  // RF-408: baja por token firmado, sin login. Devuelve false si el token es inválido
  // O si el update falla (ej. token válido de un usuario ya borrado → P2025): la ruta
  // renderiza un 400 amable en vez de tirar un 500.
  async unsubscribeByToken(token: string): Promise<boolean> {
    const userId = verifyUnsubscribeToken(token);
    if (!userId) return false;
    try {
      await userRepository.updateNotifications(userId, { emailFrequency: 'never' });
      return true;
    } catch (error) {
      logger.error('unsubscribe update failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  },

  async getNotificationsForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ notifications: NotificationItem[]; total: number; unreadCount: number }> {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      notificationRepository.findByUserId(userId, skip, limit),
      notificationRepository.countByUserId(userId),
      notificationRepository.countUnreadByUserId(userId),
    ]);
    return {
      notifications: notifications.map(toNotificationItem),
      total,
      unreadCount,
    };
  },

  // RF-307: envía el digest de matches a todos los usuarios con la frecuencia indicada
  // que tienen notificaciones new_match sin leer. Llamado por el cron de Inngest.
  // Devuelve el número de correos enviados (los errores individuales se loguean y omiten).
  async sendMatchDigest(frequency: 'daily' | 'weekly', baseUrl: string): Promise<{ sent: number }> {
    const users = await userRepository.findUsersForMatchDigest(frequency);
    let sent = 0;
    for (const user of users) {
      try {
        const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(
          signUnsubscribeToken(user.id),
        )}`;
        const email = buildDigestEmail({
          recipientName: user.name ?? user.username ?? null,
          matchCount: user.matchCount,
          ctaUrl: `${baseUrl}/matches`,
          unsubscribeUrl,
        });
        await emailService.sendEmail({ to: user.email, ...email });
        sent++;
      } catch (error) {
        logger.error('digest email failed', {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { sent };
  },

  // Returns null if notification not found or doesn't belong to user.
  // Idempotent: already-read notifications return current state without updating.
  async markNotificationRead(id: string, userId: string): Promise<NotificationItem | null> {
    const notification = await notificationRepository.findById(id);
    if (!notification || notification.userId !== userId) return null;
    if (notification.readAt) return toNotificationItem(notification);
    const updated = await notificationRepository.markRead(id);
    return toNotificationItem(updated);
  },
};
