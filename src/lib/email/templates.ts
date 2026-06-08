// RF-406: plantillas HTML transaccionales (función pura, sin I/O). Estética del mail de
// login (ref. ../email-template-magic-link.html): tablas, estilos inline, entidades HTML.
//
// EXCEPCIÓN a la regla de tokens (§7/§20): los clientes de email NO consumen CSS custom
// properties, así que los colores de marca van hardcodeados acá. Mantener en sync con
// src/app/globals.css :root. Las plantillas son copy es-UY hardcodeado (no JSX/next-intl):
// excepción documentada a §8 — este módulo es dominio puro sin runtime de i18n, igual que
// el template del login vive como HTML crudo en el dashboard de Supabase.
const COLORS = {
  bg: '#e8f3fb', // --secondary (celeste claro)
  card: '#ffffff', // --background
  cardBorder: '#d8e6f3',
  brandNavy: '#1e3a8a', // --brand ("Cambia")
  accent: '#f97316', // --accent (naranja, CTA)
  accentFg: '#1a1206', // --accent-foreground (texto oscuro sobre naranja, WCAG AA)
  ink: '#0f172a', // --foreground
  muted: '#64748b', // texto secundario legible (unsubscribe = WCAG AA sobre blanco)
  faint: '#94a3b8', // fine print no accionable
} as const;

export const EMAILABLE_NOTIFICATION_TYPES = [
  'new_match',
  'new_message',
  'rating_received',
] as const;

export type EmailableNotificationType = (typeof EMAILABLE_NOTIFICATION_TYPES)[number];

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type LayoutInput = {
  preheader: string;
  heading: string;
  bodyLines: string[];
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
};

// Documento HTML completo, compatible con clientes de email: <html lang>, charset,
// viewport, tablas role="presentation", preheader oculto, todo inline. Cada valor
// dinámico (heading/bodyLines/ctaLabel) se escapa; las URLs van escapadas en el href.
function layout({
  preheader,
  heading,
  bodyLines,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
}: LayoutInput): string {
  const safeHeading = escapeHtml(heading);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const safeUnsubUrl = escapeHtml(unsubscribeUrl);
  const paragraphs = bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 12px 0;font-size:14px;color:${COLORS.muted};line-height:1.5;">${escapeHtml(
          line,
        )}</p>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>CambiaLa</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};">
<span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent;">${escapeHtml(
    preheader,
  )}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bg};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;background-color:${COLORS.card};border-radius:16px;border:1px solid ${COLORS.cardBorder};">
        <tr>
          <td align="center" style="padding:36px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
            <span style="font-size:28px;font-weight:800;color:${COLORS.brandNavy};">Cambia</span><span style="font-size:28px;font-weight:800;color:${COLORS.accent};">La</span>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0;font-size:18px;font-weight:700;color:${COLORS.ink};">${safeHeading}</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
            ${paragraphs}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 32px 32px 32px;">
            <a href="${safeCtaUrl}" target="_blank" style="display:inline-block;background-color:${COLORS.accent};color:${COLORS.accentFg};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:10px;">
              ${safeCtaLabel}
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 32px 28px 32px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #eef4fa;">
            <p style="margin:20px 0 0 0;font-size:12px;color:${COLORS.faint};line-height:1.6;">
              CambiaLa &middot; Cambi&aacute; tus figuritas del Mundial 2026 &#x1F1FA;&#x1F1FE;<br />
              <a href="${safeUnsubUrl}" target="_blank" style="color:${COLORS.muted};text-decoration:underline;font-size:12px;">Darme de baja de estos mails</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function plainText({ heading, bodyLines, ctaLabel, ctaUrl, unsubscribeUrl }: LayoutInput): string {
  return [
    heading,
    '',
    ...bodyLines,
    '',
    `${ctaLabel}: ${ctaUrl}`,
    '',
    '—',
    'CambiaLa · Cambiá tus figuritas del Mundial 2026',
    `Para no recibir más estos mails: ${unsubscribeUrl}`,
  ].join('\n');
}

type BuildInput = {
  recipientName: string | null;
  payload: Record<string, unknown>;
  ctaUrl: string;
  unsubscribeUrl: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

// Mapea un tipo de notificación emaileable a un mail renderizado, o null si el tipo no
// lleva email. El subject va en texto plano (sin entidades HTML). El nombre se escapa
// dentro de layout(); acá solo se compone el saludo con el fallback.
export function buildNotificationEmail(type: string, input: BuildInput): RenderedEmail | null {
  const name = input.recipientName?.trim() || null;
  const hi = name ? `Hola ${name}` : 'Hola';
  const base = { ctaUrl: input.ctaUrl, unsubscribeUrl: input.unsubscribeUrl };

  let parts: LayoutInput | null = null;
  let subject = '';

  switch (type) {
    case 'new_match':
      subject = '¡Tenés un match nuevo en CambiaLa!';
      parts = {
        ...base,
        preheader: 'Encontramos a alguien para intercambiar tus figuritas.',
        heading: `${hi}, ¡tenés un match!`,
        bodyLines: [
          'Encontramos a alguien con quien podés intercambiar figuritas del Mundial.',
          'Entrá para ver el match y coordinar el cambio por el chat.',
        ],
        ctaLabel: 'Ver el match',
      };
      break;
    case 'new_message':
      subject = 'Te escribieron por un cambio en CambiaLa';
      parts = {
        ...base,
        preheader: 'Tenés un mensaje nuevo por un intercambio.',
        heading: `${hi}, tenés un mensaje`,
        bodyLines: [
          'Alguien te escribió por un intercambio de figuritas.',
          'Entrá para responder y coordinar el cambio.',
        ],
        ctaLabel: 'Responder',
      };
      break;
    case 'rating_received': {
      subject = 'Te dejaron una reseña en CambiaLa';
      const stars = typeof input.payload.stars === 'number' ? input.payload.stars : null;
      const starLine =
        stars && stars > 0
          ? `Te dejaron ${stars} ${stars === 1 ? 'estrella' : 'estrellas'} por un intercambio.`
          : 'Te dejaron una reseña por un intercambio.';
      parts = {
        ...base,
        preheader: 'Te dejaron una reseña en CambiaLa.',
        heading: `${hi}, te dejaron una reseña`,
        bodyLines: [starLine, 'Entrá para ver tu reputación en tu perfil.'],
        ctaLabel: 'Ver mi perfil',
      };
      break;
    }
    default:
      return null;
  }

  return { subject, html: layout(parts), text: plainText(parts) };
}
