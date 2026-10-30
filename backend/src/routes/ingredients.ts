import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { blockCollaboratorMutations, requireRole, sanitizeFinancialData } from '../middlewares/rbac';
import { parsePaginationParams } from '../utils/pagination';
import { parseArgentineDecimal } from '../utils/argentineNumber';
import { applyIngredientCostChange } from '../services/marginCalculator';
import { dispatchMarginAlertEvent } from '../services/marginAlertDispatcher';

const router = Router();

router.use(authMiddleware);
router.use(blockCollaboratorMutations);
router.use(sanitizeFinancialData);

function getIdParam(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) {
    return rawId[0] ?? '';
  }
  return rawId ?? '';
}

const VALID_UNITS = ['kg', 'l', 'u'] as const;
type Unit = (typeof VALID_UNITS)[number];
const MAX_MONEY_VALUE = new Prisma.Decimal('99999999.99');
const MAX_MONEY_VALUE_NUMBER = 99_999_999.99;
const BULK_MAX_ROWS = 500;

interface IngredientInputDTO {
  name?: unknown;
  unit?: unknown;
  currentCost?: unknown;
}

interface ValidatedIngredientInput {
  name: string;
  unit: Unit;
  currentCost: Prisma.Decimal;
}

function validateIngredientInput(
  body: IngredientInputDTO
): { data: ValidatedIngredientInput } | { errors: string[] } {
  const errors: string[] = [];

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    errors.push('El campo "name" es obligatorio y debe ser un texto no vacío.');
  }

  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  if (!VALID_UNITS.includes(unit as Unit)) {
    errors.push(`El campo "unit" debe ser uno de: ${VALID_UNITS.join(', ')}.`);
  }

  let currentCost: Prisma.Decimal | null = null;
  const rawCost = body.currentCost;

  if (
    rawCost === undefined ||
    rawCost === null ||
    (typeof rawCost === 'string' && rawCost.trim() === '')
  ) {
    errors.push('El campo "currentCost" es obligatorio.');
  } else {
    try {
      const decimalValue = parseArgentineDecimal(rawCost, 'currentCost');
      if (decimalValue.lessThanOrEqualTo(0)) {
        errors.push('El campo "currentCost" debe ser mayor a cero.');
      } else if (decimalValue.abs().greaterThan(MAX_MONEY_VALUE) || Math.abs(Number(rawCost)) > MAX_MONEY_VALUE_NUMBER) {
        errors.push('El insumo no puede superar $99.999.999,99.');
      } else {
        currentCost = decimalValue;
      }
    } catch (error) {
      errors.push((error as Error).message || 'El campo "currentCost" debe ser un valor decimal válido.');
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      name,
      unit: unit as Unit,
      currentCost: currentCost as Prisma.Decimal,
    },
  };
}

function parseIngredientInput(body: IngredientInputDTO): ValidatedIngredientInput {
  const validation = validateIngredientInput(body);
  if ('errors' in validation) {
    throw new AppError(validation.errors.join(' '), 400);
  }
  return validation.data;
}

/* ------------------------------------------------------------------ */
/* GET /api/ingredients                                                */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const query = { ...(req.query as Record<string, unknown>) };

  if (req.user!.role === 'COLLABORATOR') {
    const rawSortBy = typeof query.sortBy === 'string' ? query.sortBy : '';
    if (!['name', 'updatedAt'].includes(rawSortBy)) {
      query.sortBy = 'name';
    }
  }

  const { page, limit, sortBy, order } = parsePaginationParams(query);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.ingredient.findMany({
      where: { accountId },
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.ingredient.count({ where: { accountId } }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return res.status(200).json({
    data,
    meta: { total, page, limit, totalPages },
  });
});

/* ------------------------------------------------------------------ */
/* GET /api/ingredients/:id                                            */
/* Incluye presentaciones de proveedores asociadas para rol ADMIN.     */
/* (RBAC sanitizeFinancialData limpia 'suppliers' para COLLABORATOR)   */
/* ------------------------------------------------------------------ */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const ingredient = await prisma.ingredient.findFirst({
    where: { id, accountId },
    include: {
      suppliers: {
        include: {
          supplier: true,
        },
      },
    },
  });

  if (!ingredient) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  return res.status(200).json({ ingredient });
});

/* ------------------------------------------------------------------ */
/* GET /api/ingredients/:id/history                                    */
/* ------------------------------------------------------------------ */
router.get('/:id/history', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const ingredient = await prisma.ingredient.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!ingredient) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const history = await prisma.priceHistory.findMany({
    where: { ingredientId: id },
    orderBy: { changedAt: 'asc' },
  });

  return res.status(200).json({ history });
});

/* ------------------------------------------------------------------ */
/* POST /api/ingredients                                               */
/* ------------------------------------------------------------------ */
router.post('/', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const { name, unit, currentCost } = parseIngredientInput(req.body as IngredientInputDTO);

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      unit,
      currentCost,
      accountId,
    },
  });

  return res.status(201).json({ ingredient });
});

/**
 * Carga masiva de insumos por planilla.
 *
 * El payload principal es un array de filas, pero aceptamos también un wrapper
 * con { rows: [...] } para tolerar futuras integraciones del frontend sin romper
 * la contractibilidad del PR. La validación es por fila, nunca bloquea el resto,
 * y la operación completa queda envuelta en una única transacción.
 */
router.post('/bulk', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const rawPayload = req.body as unknown;
  const rows: unknown[] = Array.isArray(rawPayload)
    ? rawPayload
    : Array.isArray((rawPayload as { rows?: unknown[] } | null)?.rows)
      ? (rawPayload as { rows: unknown[] }).rows
      : [];

  if (!Array.isArray(rawPayload) && !Array.isArray((rawPayload as { rows?: unknown[] } | null)?.rows)) {
    throw new AppError('La carga masiva debe enviarse como un array de filas.', 400);
  }

  if (rows.length > BULK_MAX_ROWS) {
    throw new AppError(
      `La lista supera el tope de ${BULK_MAX_ROWS} filas por lote. Dividila en varios lotes más pequeños.`,
      413
    );
  }

  const errors: Array<{ row: number; reason: string }> = [];
  const validRows: Array<{ name: string; unit: Unit; cost: Prisma.Decimal }> = [];
  const existingNames = new Set(
    (await prisma.ingredient.findMany({
      where: { accountId },
      select: { name: true },
    })).map((row) => row.name.trim().toLowerCase())
  );
  const seenInBatch = new Set<string>();
  let skipped = 0;

  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object') {
      errors.push({ row: index + 1, reason: 'La fila debe contener un objeto con nombre, unidad y costo.' });
      continue;
    }

    const candidate = row as Record<string, unknown>;
    const name = String(candidate.name ?? candidate.nombre ?? '').trim();
    const unit = String(candidate.unit ?? candidate.unidad ?? '').trim().toLowerCase();
    const rawCost = candidate.cost ?? candidate.costo ?? candidate.currentCost;
    const normalizedName = name.toLowerCase();

    const validationErrors: string[] = [];

    // 1. Validación de nombre
    if (!name) {
      validationErrors.push('El campo "name" es obligatorio y debe ser un texto no vacío.');
    }

    // 2. Validación de unidad
    if (!VALID_UNITS.includes(unit as Unit)) {
      validationErrors.push(`El campo "unit" debe ser uno de: ${VALID_UNITS.join(', ')}.`);
    }

    // 3. Validación de costo
    let parsedCost: Prisma.Decimal | null = null;
    if (rawCost === undefined || rawCost === null || (typeof rawCost === 'string' && rawCost.trim() === '')) {
      validationErrors.push('El campo "cost" es obligatorio.');
    } else {
      try {
        const decimalValue = parseArgentineDecimal(rawCost, 'cost');
        if (decimalValue.lessThanOrEqualTo(0)) {
          validationErrors.push('El campo "cost" debe ser mayor a cero.');
        } else if (decimalValue.abs().greaterThan(MAX_MONEY_VALUE)) {
          validationErrors.push('El insumo no puede superar $99.999.999,99.');
        } else {
          parsedCost = decimalValue;
        }
      } catch (error) {
        validationErrors.push((error as Error).message || 'El campo "cost" debe ser un valor decimal válido.');
      }
    }

    // Si hubo cualquier error de validación, se reporta y NO se considera como skipped
    if (validationErrors.length > 0) {
      errors.push({ row: index + 1, reason: validationErrors.join(' ') });
      continue;
    }

    // 4. Chequeo de duplicado (solo sobre filas sintáctica y semánticamente válidas)
    if (existingNames.has(normalizedName) || seenInBatch.has(normalizedName)) {
      skipped += 1;
      continue;
    }

    // 5. Fila válida y no duplicada: se encola para inserción
    validRows.push({ name, unit: unit as Unit, cost: parsedCost! });
    seenInBatch.add(normalizedName);
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    for (const item of validRows) {
      await tx.ingredient.create({
        data: {
          name: item.name,
          unit: item.unit,
          currentCost: item.cost,
          accountId,
        },
      });
    }

    return validRows.length;
  });

  return res.status(200).json({
    created: transactionResult,
    skipped,
    errors,
  });
});

/* ------------------------------------------------------------------ */
/* PUT /api/ingredients/:id                                            */
/* ------------------------------------------------------------------ */
router.put('/:id', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.is('application/json')) {
    throw new AppError('El header Content-Type debe ser application/json.', 400);
  }

  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const existing = await prisma.ingredient.findFirst({
    where: { id, accountId },
    select: { id: true, name: true, unit: true, currentCost: true },
  });

  if (!existing) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const { name, unit, currentCost } = parseIngredientInput(req.body as IngredientInputDTO);
  const nextCost = new Prisma.Decimal(currentCost.toString()).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const previousCostForComparison = existing.currentCost ?? new Prisma.Decimal(0);
  const hasNoActualChange =
    previousCostForComparison.equals(nextCost) && existing.name === name && existing.unit === unit;

  if (hasNoActualChange) {
    return res.status(200).json({
      ingredient: existing,
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    });
  }

  const previousCost = existing.currentCost ?? null;

  const result = await prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.update({
      where: { id },
      data: { name, unit, currentCost: nextCost },
    });

    const { affectedProductsCount, affectedProducts, criticalProducts } = await applyIngredientCostChange(tx, id, previousCost, nextCost);

    return { ingredient, affectedProductsCount, affectedProducts, criticalProducts };
  });

  if (result.criticalProducts.length > 0) {
    void dispatchMarginAlertEvent({
      accountId,
      ingredientId: id,
      ingredientName: name,
      affectedProductsCount: result.affectedProductsCount,
      criticalProducts: result.criticalProducts.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        previousCost: product.previousCost.toFixed(2),
        newCost: product.newCost.toFixed(2),
        currentMarginPercent: product.currentMarginPercent.toFixed(2),
        minMarginPercent: product.minMarginPercent.toFixed(2),
      })),
    });
  }

  return res.status(200).json({
    ingredient: result.ingredient,
    affectedProductsCount: result.affectedProductsCount,
    affectedProducts: result.affectedProducts.map((product) => ({
      productId: product.productId,
      productName: product.productName,
      previousCost: product.previousCost.toFixed(2),
      newCost: product.newCost.toFixed(2),
      currentMarginPercent: product.currentMarginPercent.toFixed(2),
      minMarginPercent: product.minMarginPercent.toFixed(2),
    })),
    criticalProducts: result.criticalProducts.map((product) => ({
      productId: product.productId,
      productName: product.productName,
      previousCost: product.previousCost.toFixed(2),
      newCost: product.newCost.toFixed(2),
      currentMarginPercent: product.currentMarginPercent.toFixed(2),
      minMarginPercent: product.minMarginPercent.toFixed(2),
    })),
  });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/ingredients/:id                                         */
/* ------------------------------------------------------------------ */
router.delete('/:id', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const existing = await prisma.ingredient.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const usages = await prisma.productIngredient.findMany({
    where: { ingredientId: id },
    select: {
      product: {
        select: { id: true, name: true },
      },
    },
  });

  if (usages.length > 0) {
    return res.status(409).json({
      error: 'No se puede eliminar el insumo porque forma parte de una o más recetas activas.',
      productsAffected: usages.map((u) => u.product),
    });
  }

  await prisma.ingredient.delete({ where: { id } });

  return res.status(200).json({ message: 'Insumo eliminado correctamente.' });
});

export default router;