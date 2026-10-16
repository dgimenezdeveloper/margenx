import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { applyIngredientCostChange, calculateUnitCost } from '../services/marginCalculator';

const router = Router();

/* ------------------------------------------------------------------ */
/* POST /api/webhooks/supplier-prices                                   */
/* Recibe listas de precios desde servicio satélite autenticado por      */
/* secreto interno. Rechaza solicitudes no autorizadas con 401.          */
/* 200 OK | 400 Payload inválido | 401 No autorizado | 404 Slug inexistente/inactivo */
/* ------------------------------------------------------------------ */
export const supplierPricesIngestSchema = z.object({
  accountSlug: z.string().trim().min(2),
  items: z.array(
    z.object({
      code: z.string().trim().min(1),
      description: z.string().optional(),
      price: z.coerce.number().positive(),
    })
  ).min(1).max(5000),
});

/*
  Valida la cabecera interna del servicio satélite. Se compara con timingSafeEqual
  para evitar ataques de timing en la autenticación inter-servicio.
*/
function hasValidInternalSecret(req: Request): boolean {
  const expectedSecret = process.env.INTERNAL_WEBHOOK_SECRET ?? '';
  const incomingSecret = req.get('x-margenx-webhook-secret') ?? '';

  if (!expectedSecret || !incomingSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const actual = Buffer.from(incomingSecret);

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

router.post('/supplier-prices', async (req: Request, res: Response) => {
  if (!hasValidInternalSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = supplierPricesIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({
      error: issue?.message ?? 'Payload inválido.',
    });
  }

  const { accountSlug, items } = parsed.data;

  const account = await prisma.account.findUnique({
    where: { slug: accountSlug },
  });

  if (!account || !account.isActive) {
    throw new AppError('No existe una cuenta activa para el slug indicado.', 404);
  }

  const incomingCodes = items.map((item) => item.code);

  const mappedItems = await prisma.supplierIngredient.findMany({
    where: {
      supplierCode: { in: incomingCodes },
      ingredient: { accountId: account.id },
    },
    include: {
      ingredient: true,
    },
  });

  const incomingByCode = new Map(items.map((item) => [item.code, item]));
  const criticalProductsAlerts: Array<{
    productId?: string;
    productName?: string;
    previousCost?: string;
    newCost?: string;
    currentMarginPercent?: string;
    minMarginPercent?: string;
  }> = [];

  await prisma.$transaction(
    async (tx: any) => {
      for (const mapped of mappedItems) {
        const currentItem = incomingByCode.get(mapped.supplierCode ?? '');
        if (!currentItem) continue;

        const newUnitCost = calculateUnitCost(new Prisma.Decimal(String(currentItem.price)), mapped.packageSize);
        const packagePrice = new Prisma.Decimal(String(currentItem.price));

        await tx.supplierIngredient.update({
          where: { id: mapped.id },
          data: { packagePrice },
        });

        if (mapped.isDefault) {
          const ingredientSnapshot = await tx.ingredient.findUnique({
            where: { id: mapped.ingredientId },
            select: { currentCost: true },
          });
          const previousCost = ingredientSnapshot?.currentCost ?? mapped.ingredient.currentCost;

          await tx.ingredient.update({
            where: { id: mapped.ingredientId },
            data: { currentCost: newUnitCost },
          });

          const criticalProducts = await applyIngredientCostChange(tx, mapped.ingredientId, previousCost, newUnitCost);

          criticalProductsAlerts.push(
            ...criticalProducts.map((product) => ({
              productId: product.productId,
              productName: product.productName,
              previousCost: product.previousCost.toFixed(2),
              newCost: product.newCost.toFixed(2),
              currentMarginPercent: product.currentMarginPercent.toFixed(2),
              minMarginPercent: product.minMarginPercent.toFixed(2),
            }))
          );
        }
      }
    },
    { timeout: 30000 }
  );

  return res.status(200).json({
    received: items.length,
    updated: mappedItems.length,
    discarded: items.length - mappedItems.length,
    criticalProductsAlerts,
  });
});

export default router;
