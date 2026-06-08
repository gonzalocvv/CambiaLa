import { escapeHtml } from '@/lib/email/templates';
import { verifyResubscribeToken, verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import { notificationService } from '@/services/notification.service';

// RF-408: baja de mails sin login, vía token firmado (HMAC). El GET NO muta (los clientes
// de mail y escáneres pre-cargan los links → un GET mutante daría de baja a gente sin
// intención). El GET muestra una confirmación; el POST (click explícito) ejecuta la baja.
// RF-345: token con expiración; reactivación en un click con token de resubscribe.
// Referrer-Policy: no-referrer para no filtrar el token por Referer; Cache-Control no-store
// para que la página con el token no la cachee ningún intermediario.
//
// Excepción documentada a §7/§8: esta es una Response HTML standalone (sin React ni runtime
// de next-intl), con estilos inline tipo email; el copy es-UY y los hex de marca van crudos
// acá a propósito, igual que en src/lib/email/templates.ts.

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

function page(opts: {
  heading: string;
  body: string;
  formToken?: string;
  resubToken?: string;
}): string {
  const form = opts.formToken
    ? `<form method="post" action="/api/unsubscribe" style="margin:20px 0 0 0;">
         <input type="hidden" name="token" value="${escapeHtml(opts.formToken)}" />
         <button type="submit" style="display:inline-block;background-color:#f97316;color:#1a1206;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;border:none;cursor:pointer;padding:12px 32px;border-radius:10px;">Darme de baja</button>
       </form>`
    : '';

  const resubForm = opts.resubToken
    ? `<form method="post" action="/api/unsubscribe" style="margin:16px 0 0 0;">
         <input type="hidden" name="action" value="resubscribe" />
         <input type="hidden" name="token" value="${escapeHtml(opts.resubToken)}" />
         <button type="submit" style="display:inline-block;background-color:#e8f3fb;color:#0c4a6e;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;border:1px solid #0284c7;cursor:pointer;padding:10px 24px;border-radius:10px;">Reactivar notificaciones</button>
       </form>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>CambiaLa</title></head>
<body style="margin:0;padding:0;background-color:#e8f3fb;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:440px;margin:48px auto;background:#ffffff;border:1px solid #d8e6f3;border-radius:16px;padding:36px 32px;text-align:center;">
    <p style="margin:0 0 16px 0;font-size:28px;font-weight:800;"><span style="color:#1e3a8a;">Cambia</span><span style="color:#f97316;">La</span></p>
    <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(opts.heading)}</p>
    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.5;">${escapeHtml(opts.body)}</p>
    ${form}${resubForm}
  </div>
</body>
</html>`;
}

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!verifyUnsubscribeToken(token)) {
    return new Response(
      page({
        heading: 'Link inválido o vencido',
        body: 'No pudimos validar este link de baja. Podés cambiar tus preferencias desde Ajustes.',
      }),
      { status: 400, headers: PAGE_HEADERS },
    );
  }
  return new Response(
    page({
      heading: '¿Querés dejar de recibir mails?',
      body: 'Vas a dejar de recibir avisos por mail de CambiaLa. Podés reactivarlos cuando quieras desde Ajustes.',
      formToken: token,
    }),
    { status: 200, headers: PAGE_HEADERS },
  );
}

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData().catch(() => null);
  const action = typeof form?.get('action') === 'string' ? (form.get('action') as string) : '';
  const token = typeof form?.get('token') === 'string' ? (form.get('token') as string) : '';

  // Reactivation path
  if (action === 'resubscribe') {
    if (!verifyResubscribeToken(token)) {
      return new Response(
        page({
          heading: 'Link inválido o vencido',
          body: 'No pudimos procesar la reactivación. Podés cambiar tus preferencias desde Ajustes.',
        }),
        { status: 400, headers: PAGE_HEADERS },
      );
    }
    const ok = await notificationService.resubscribeByToken(token);
    if (!ok) {
      return new Response(
        page({
          heading: 'No se pudo reactivar',
          body: 'Ocurrió un error al reactivar tus notificaciones. Podés hacerlo desde Ajustes.',
        }),
        { status: 400, headers: PAGE_HEADERS },
      );
    }
    return new Response(
      page({
        heading: '¡Listo, reactivaste tus notificaciones!',
        body: 'Volvés a recibir avisos por mail de CambiaLa. Podés ajustar la frecuencia desde Ajustes.',
      }),
      { status: 200, headers: PAGE_HEADERS },
    );
  }

  // Unsubscribe path
  const result = await notificationService.unsubscribeByToken(token);
  if (!result.ok) {
    return new Response(
      page({
        heading: 'Link inválido o vencido',
        body: 'No pudimos procesar la baja. Podés cambiar tus preferencias desde Ajustes.',
      }),
      { status: 400, headers: PAGE_HEADERS },
    );
  }

  const resubToken = notificationService.buildResubscribeToken(
    // Extract userId from the verified token (already validated inside unsubscribeByToken)
    token.split('.')[0],
    result.prevFreq,
  );

  return new Response(
    page({
      heading: 'Listo, te diste de baja',
      body:
        result.prevFreq === 'never'
          ? 'No te vamos a mandar más mails. Si cambiás de idea, activá los avisos desde Ajustes.'
          : 'No te vamos a mandar más mails. ¿Te arrepentiste? Podés reactivarlos abajo o desde Ajustes.',
      resubToken: resubToken ?? undefined,
    }),
    { status: 200, headers: PAGE_HEADERS },
  );
}
