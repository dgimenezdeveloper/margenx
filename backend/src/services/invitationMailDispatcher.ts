/**
 * Mail de invitación de un colaborador (ADR-008).
 *
 * Clerk crea la invitación sin mandar su mail (`notify: false`) y el backend despacha el
 * enlace a n8n, que arma el mail en español con la plantilla de MargenX y lo envía por
 * Brevo desde la casilla verificada de margenx.tech (`infra/n8n/workflows/invitacion-colaborador.json`).
 * Igual que las alertas de margen (ADR-003), n8n solo recibe datos: no toca la base.
 *
 * Devuelve `true` solo si n8n confirmó el envío. Nunca lanza: si falla, la invitación igual
 * existe y el ADMIN puede copiar el enlace desde Perfil. El enlace no se registra en los logs.
 */
export interface InvitationEmail {
  email: string;
  tradeName: string;
  inviterEmail: string;
  invitationUrl: string;
}

/** Vencimiento de las invitaciones de Clerk (valor por defecto de `createInvitation`). */
export const INVITATION_EXPIRES_IN_DAYS = 30;

const DISPATCH_TIMEOUT_MS = 5000;

export async function dispatchInvitationEmail(invitation: InvitationEmail): Promise<boolean> {
  const webhookUrl = process.env.N8N_INVITATION_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET?.trim();

  if (!webhookUrl) {
    return false;
  }
  if (!webhookSecret) {
    console.error('[InvitationMail] INTERNAL_WEBHOOK_SECRET no está configurado: no se despacha el mail de invitación.');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
        'x-margenx-webhook-secret': webhookSecret,
      },
      body: JSON.stringify({ ...invitation, expiresInDays: INVITATION_EXPIRES_IN_DAYS }),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[InvitationMail] n8n respondió HTTP ${response.status}: el mail de invitación no se envió.`);
      return false;
    }
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'desconocido';
    console.error(`[InvitationMail] No se pudo contactar a n8n (${reason}): el mail de invitación no se envió.`);
    return false;
  }
}
