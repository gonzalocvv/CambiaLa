import { Resend } from 'resend';

import { logger } from '@/lib/logger';

// RF-406: envío transaccional vía Resend. Único módulo que toca Resend (capas: lo
// orquesta notification.service; nada de Resend en routes/components). Sin RESEND_API_KEY
// es no-op (dev/tests/build con env mock no mandan mails de verdad). Lee el env en cada
// llamada (lazy) para no romper el build cuando la key no está.
// Va awaited en el request (serverless mata el trabajo no-awaited al responder), así que
// el timeout acota cuánto bloquea el hot path. RF-307/Inngest lo saca del request.
const SEND_TIMEOUT_MS = 4000;

// Remitente de marca. RESEND_FROM_EMAIL debe ser una casilla del dominio verificado.
function fromAddress(): string {
  const email = process.env.RESEND_FROM_EMAIL || 'consultas@cambiala.uy';
  return `CambiaLa <${email}>`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('email send timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export const emailService = {
  // Lanza ante fallo de Resend o timeout (el caller lo atrapa). No-op + warn sin API key.
  async sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.warn('email skipped: RESEND_API_KEY not set');
      return;
    }

    const resend = new Resend(apiKey);
    const { error } = await withTimeout(
      resend.emails.send({ from: fromAddress(), to, subject, html, text }),
      SEND_TIMEOUT_MS,
    );
    if (error) {
      // error.message es seguro de propagar; el caller loguea solo el mensaje (sin secretos).
      throw new Error(`resend send failed: ${error.message}`);
    }
  },
};
