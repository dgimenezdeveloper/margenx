import { Prisma } from '@prisma/client';

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
 * Dispatch fire-and-forget para la alerta de margen crítico.
 * El controlador no debe bloquearse esperando a la red del webhook.
 */
export async function dispatchMarginAlertEvent(payload: MarginAlertPayload): Promise<void> {
  const webhookUrl = process.env.N8N_MARGIN_ALERT_WEBHOOK_URL?.trim();

  if (!webhookUrl || payload.criticalProducts.length === 0) {
    return;
  }

  try {
    const normalizedPayload: MarginAlertPayload = {
      ...payload,
      criticalProducts: payload.criticalProducts.map((product) => ({
        ...product,
        previousCost: formatDecimal(product.previousCost),
        newCost: formatDecimal(product.newCost),
        currentMarginPercent: formatDecimal(product.currentMarginPercent),
        minMarginPercent: formatDecimal(product.minMarginPercent),
      })),
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedPayload),
    });
  } catch (error) {
    console.error('No se pudo despachar la alerta de margen crítico.', error);
  }
}
