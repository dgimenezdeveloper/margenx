import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Payload de alerta crítica de margen para n8n.
 *
 * Este despachador no es un endpoint HTTP público; es un webhook saliente que el
 * backend dispara cuando un producto cruza el margen mínimo y se requiere avisar al
 * Administrador o consolidar la alerta para que n8n la transforme en correo y/o
 * seguimiento. La ejecución es fail-closed: si no hay secreto o URL configurada, la
 * alerta no se envía.
 */
export interface MarginAlertCriticalProduct {
  productId: string;
  productName: string;
  previousCost: string;
  newCost: string;
  currentMarginPercent: string;
  minMarginPercent: string;
}

export interface MarginAlertPayload {
  accountId: string;
  ingredientId: string;
  ingredientName: string;
  affectedProductsCount: number;
  criticalProducts: MarginAlertCriticalProduct[];
}

function formatDecimal(value: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(String(value)).toFixed(2);
}

/**
 * Dispatcher asíncrono hacia n8n.
 * Resuelve dinámicamente los datos del comercio y el email del dueño (ADMIN)
 * garantizando aislamiento multi-tenant y autenticando con secreto compartido.
 * Opera bajo patrón Fail-Closed (no despacha si no hay secreto configurado).
 *
 * Envía la alerta crítica de margen a n8n.
 *
 * La documentación del proyecto define a n8n como orquestador de notificaciones y
 * no como fuente de verdad del cálculo. Por eso este dispatcher sólo entrega el
 * contexto final calculado por el backend y delega en n8n la composición del mail,
 * la planificación o la notificación externa.
 */
export async function dispatchMarginAlertEvent(payload: MarginAlertPayload): Promise<void> {
  const webhookUrl = process.env.N8N_MARGIN_ALERT_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET?.trim();

  if (!webhookUrl || payload.criticalProducts.length === 0) {
    return;
  }

  // 1. Blindaje Fail-Closed: nunca enviar peticiones si el secreto no está configurado
  if (!webhookSecret) {
    console.error(
      '[MarginAlert] Error crítico de seguridad: INTERNAL_WEBHOOK_SECRET no está configurado en las variables de entorno. Despacho cancelado para prevenir fail-open.'
    );
    return;
  }

  try {
    // 2. Resolver dinámicamente la cuenta y el email del ADMIN destinatario
    const account = await prisma.account.findUnique({
      where: { id: payload.accountId },
      select: {
        businessName: true,
        slug: true,
        users: {
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
          select: { email: true },
          take: 1,
        },
      },
    });

    if (!account) {
      console.warn(`[MarginAlert] No se encontró la cuenta con ID: ${payload.accountId}`);
      return;
    }

    const tradeName = account.businessName;
    const ownerEmail = account.users[0]?.email;

    if (!ownerEmail) {
      console.warn(`[MarginAlert] La cuenta "${tradeName}" no tiene un usuario ADMIN con email registrado.`);
      return;
    }

    // 3. Normalizar payload con datos dinámicos
    const appBaseUrl = process.env.APP_BASE_URL?.trim();

    const dynamicPayload = {
      accountId: payload.accountId,
      accountSlug: account.slug,
      tradeName,
      ownerEmail,
      ingredient: {
        id: payload.ingredientId,
        name: payload.ingredientName,
      },
      affectedProductsCount: payload.affectedProductsCount,
      criticalProducts: payload.criticalProducts.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        previousCost: formatDecimal(product.previousCost),
        newCost: formatDecimal(product.newCost),
        currentMarginPercent: formatDecimal(product.currentMarginPercent),
        minMarginPercent: formatDecimal(product.minMarginPercent),
      })),
      triggeredAt: new Date().toISOString(),
      // Base del link de la alerta según entorno; si no está definida, n8n usa su fallback.
      ...(appBaseUrl ? { appBaseUrl } : {}),
    };

    // 4. Despachar a n8n autenticando mediante header secreto
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
        'x-margenx-webhook-secret': webhookSecret,
      },
      body: JSON.stringify(dynamicPayload),
      signal: AbortSignal.timeout(5000),
    });

    // 5. Verificación estricta de respuesta HTTP (previene pérdida silenciosa de alertas ante 401/500)
    if (!response.ok) {
      console.error(
        `[MarginAlert] Error de despacho HTTP ${response.status} (${response.statusText}) desde el webhook de n8n. La alerta de margen no fue entregada.`
      );
    }
  } catch (error) {
    console.error('[MarginAlert] Error de red al despachar alerta de margen crítico a n8n:', error);
  }
}