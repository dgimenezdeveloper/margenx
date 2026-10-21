import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { applyIngredientCostChange, calculateUnitCost } from '../services/marginCalculator';

const router = Router();

/**
 * POST /api/webhooks/supplier-prices
 * Webhook de ingesta por proveedor.
 *
 * Contrato de integración con n8n / sistema satélite que reenvía listas de precios
 * recibidas por correo o WhatsApp. El backend valida el secreto compartido, resuelve
 * cada `supplierCode` dentro de la cuenta y del proveedor correcto, descarta filas sin
 * mapeo y conserva un resumen fiable de qué se actualizó, quedó sin cambios, pasó a
 * cuarentena o fue descartado.
 *
 * El diseño está alineado con la documentación del proyecto en /docs:
 * - la identificación del proveedor es implícita por `supplierCode`
 * - las listas no crean nuevos insumos ni contaminan el catálogo
 * - los cambios de costo solo se ejecutan si el valor es real y válido
 * - n8n conserva la lógica de ensamblado del resumen final y de las alertas
 *
 * Payload esperado:
 * {
 *   accountSlug: string,
 *   items: [{ code: string, description?: string, price: number }]
 * }
 * 
 * 200 OK | 400 Payload inválido | 401 No autorizado | 404 Slug inexistente/inactivo
 */
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

/**
 * Valida la cabecera `x-margenx-webhook-secret` del servicio satélite.
 *
 * Se usa `timingSafeEqual` para evitar ataques de timing en la autenticación
 * inter-servicio. El patrón es fail-closed: si falta o es incorrecto, el webhook
 * responde 401 y no procesa ninguna solicitud.
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

/**
 * Procesa la ingesta masiva de precios de un proveedor.
 *
 * Flujo de negocio:
 * 1. valida autenticación interna
 * 2. valida el payload
 * 3. resuelve la cuenta activa por `accountSlug`
 * 4. deduplica items por `code` dentro del mismo lote
 * 5. busca coincidencias de `supplierCode` dentro de la cuenta
 * 6. descarta filas sin mapping, proveedor inactivo o ambiguas
 * 7. compara el precio contra la presentación vigente para decidir:
 *    - mismo precio => `unchanged`
 *    - precio anómalo => `quarantined`
 *    - precio válido => `updated`
 * 8. si aplica, recalcula `Ingredient.currentCost` y dispara la cascada de productos
 * 9. responde un resumen veraz para que n8n construya el correo y el dashboard
 *
 * La lógica respeta la arquitectura definida en /docs:
 * - no crea nuevos insumos
 * - no mezcla proveedores distintos dentro de la misma cuenta
 * - no recalcula si no hubo cambio
 * - no sobreescribe precios en cuarentena
 */
router.post('/supplier-prices', async (req: Request, res: Response) => {
  const startedAt = Date.now();

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
    include: {
      users: {
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { email: true },
      },
    },
  });

  if (!account || !account.isActive) {
    throw new AppError('No existe una cuenta activa para el slug indicado.', 404);
  }

  const dedupedItems = new Map<string, (typeof items)[number]>();
  let duplicates = 0;

  for (const item of items) {
    if (dedupedItems.has(item.code)) {
      duplicates += 1;
    }
    dedupedItems.set(item.code, item);
  }

  const uniqueItems = [...dedupedItems.values()];
  const incomingCodes = uniqueItems.map((item) => item.code);
  const mappedRows = await prisma.supplierIngredient.findMany({
    where: {
      supplierCode: { in: incomingCodes },
      ingredient: { accountId: account.id },
    },
    include: {
      ingredient: true,
      supplier: true,
    },
  });

  const mappedByCode = new Map<string, typeof mappedRows>();
  for (const row of mappedRows) {
    const key = row.supplierCode ?? '';
    if (!key) continue;
    const bucket = mappedByCode.get(key) ?? [];
    bucket.push(row);
    mappedByCode.set(key, bucket);
  }

  const discardedCodes: Array<{ code: string; reason: string }> = [];
  const criticalProductsAlerts: Array<{
    productId?: string;
    productName?: string;
    previousCost?: string;
    newCost?: string;
    currentMarginPercent?: string;
    minMarginPercent?: string;
  }> = [];

  let updated = 0;
  let unchanged = 0;
  let quarantined = 0;
  let discarded = 0;

  await prisma.$transaction(async (tx: any) => {
    for (const item of uniqueItems) {
      const rows = mappedByCode.get(item.code) ?? [];
      const activeRows = rows.filter((row) => row.supplier?.isActive !== false);

      if (rows.length === 0) {
        discarded += 1;
        discardedCodes.push({ code: item.code, reason: 'NOT_FOUND' });
        continue;
      }

      if (activeRows.length === 0) {
        discarded += 1;
        discardedCodes.push({ code: item.code, reason: 'INACTIVE_SUPPLIER' });
        continue;
      }

      if (new Set(activeRows.map((row) => row.supplierId)).size > 1) {
        discarded += 1;
        discardedCodes.push({ code: item.code, reason: 'AMBIGUOUS' });
        continue;
      }

      const mapped = activeRows[0];
      if (!mapped) {
        discarded += 1;
        discardedCodes.push({ code: item.code, reason: 'AMBIGUOUS' });
        continue;
      }

      const newPrice = new Prisma.Decimal(String(item.price));
      const previousPackagePrice = mapped.packagePrice;
      let previousUnitCost: Prisma.Decimal;
      let newUnitCost: Prisma.Decimal | null = null;
      let shouldQuarantine = false;
      let quarantineReason = 'VARIACION_MAYOR_50_POR_CIENTO';

      try {
        previousUnitCost = calculateUnitCost(previousPackagePrice, mapped.packageSize);
      } catch (_error) {
        previousUnitCost = new Prisma.Decimal('0');
      }

      try {
        newUnitCost = calculateUnitCost(newPrice, mapped.packageSize);
      } catch (_error) {
        shouldQuarantine = true;
        quarantineReason = 'COSTO_UNITARIO_INSUFICIENTE';
      }

      const zero = new Prisma.Decimal('0');
      const threshold = new Prisma.Decimal('50');
      const variation = previousUnitCost.gt(zero) && newUnitCost
        ? newUnitCost.sub(previousUnitCost).div(previousUnitCost).mul(100).abs()
        : new Prisma.Decimal('1000');

      const isSamePrice = newPrice.equals(previousPackagePrice);
      if (isSamePrice) {
        if (mapped.isQuarantined) {
          await tx.supplierIngredient.update({
            where: { id: mapped.id },
            data: {
              pendingPackagePrice: null,
              isQuarantined: false,
              quarantinedAt: null,
              quarantineReason: null,
            },
          });
        }
        unchanged += 1;
        continue;
      }

      if (!shouldQuarantine && newUnitCost) {
        shouldQuarantine = newUnitCost.lte(new Prisma.Decimal('0.01')) || variation.gt(threshold);
      }
      if (!newUnitCost && !shouldQuarantine) {
        shouldQuarantine = true;
      }
      if (shouldQuarantine && quarantineReason === 'VARIACION_MAYOR_50_POR_CIENTO' && newUnitCost?.lte(new Prisma.Decimal('0.01'))) {
        quarantineReason = 'COSTO_UNITARIO_INSUFICIENTE';
      }

      await tx.supplierIngredient.update({
        where: { id: mapped.id },
        data: shouldQuarantine
          ? {
            packagePrice: previousPackagePrice,
            pendingPackagePrice: newPrice,
            isQuarantined: true,
            quarantinedAt: new Date(),
            quarantineReason,
          }
          : {
            packagePrice: newPrice,
            pendingPackagePrice: null,
            isQuarantined: false,
            quarantinedAt: null,
            quarantineReason: null,
          },
      });

      if (shouldQuarantine) {
        quarantined += 1;
        continue;
      }

      if (mapped.isDefault) {
        const ingredientSnapshot = await tx.ingredient.findUnique({
          where: { id: mapped.ingredientId },
          select: { currentCost: true },
        });
        const previousCost = ingredientSnapshot?.currentCost ?? mapped.ingredient.currentCost;

        if (!newUnitCost) {
          quarantined += 1;
          continue;
        }

        await tx.ingredient.update({
          where: { id: mapped.ingredientId },
          data: { currentCost: newUnitCost },
        });

        const { criticalProducts } = await applyIngredientCostChange(
          tx,
          mapped.ingredientId,
          previousCost,
          newUnitCost
        );

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

      updated += 1;
    }
  }, { timeout: 30000 });

  const responseBody = {
    received: items.length,
    updated,
    unchanged,
    quarantined,
    duplicates,
    discarded,
    discardedCodes: discardedCodes.slice(0, 100),
    account: {
      tradeName: account.businessName ?? account.slug,
      ownerEmail: account.users?.[0]?.email ?? null,
    },
    criticalProductsAlerts,
  };

  console.info(JSON.stringify({
    accountId: account.id,
    received: responseBody.received,
    updated: responseBody.updated,
    unchanged: responseBody.unchanged,
    quarantined: responseBody.quarantined,
    duplicates: responseBody.duplicates,
    discarded: responseBody.discarded,
    durationMs: Date.now() - startedAt,
  }));

  return res.status(200).json(responseBody);
});

export default router;
