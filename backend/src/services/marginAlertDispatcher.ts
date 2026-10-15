import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

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
 * Resuelve de forma 100% dinámica los datos del comercio y el email del dueño
 * para garantizar aislamiento multi-tenant sin ningún valor hardcodeado.
 */
export async function dispatchMarginAlertEvent(payload: MarginAlertPayload): Promise<void> {
  const webhookUrl = process.env.N8N_MARGIN_ALERT_WEBHOOK_URL?.trim();

  if (!webhookUrl || payload.criticalProducts.length === 0) {
    return;
  }

  try {
    // 1. Resolver dinámicamente la cuenta y el email del ADMIN destinatario
    const account = await prisma.account.findUnique({
      where: { id: payload.accountId },
      select: {
        businessName: true,
        slug: true,
        users: {
          where: { role: 'ADMIN' },
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
      console.warn(`[MarginAlert] La cuenta ${tradeName} no tiene un usuario ADMIN con email registrado.`);
      return;
    }

    // 2. Normalizar payload con datos 100% dinámicos
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
    };

    // 3. Enviar a n8n
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
      },
      body: JSON.stringify(dynamicPayload),
    });
  } catch (error) {
    console.error('[MarginAlert] Error al despachar alerta de margen crítico a n8n:', error);
  }
}