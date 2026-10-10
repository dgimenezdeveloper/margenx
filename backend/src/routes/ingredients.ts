import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { blockCollaboratorMutations, requireRole, sanitizeFinancialData } from '../middlewares/rbac';
import { parsePaginationParams } from '../utils/pagination';
import { applyIngredientCostChange } from '../services/marginCalculator';

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
  } else if (typeof rawCost !== 'string' && typeof rawCost !== 'number') {
    errors.push('El campo "currentCost" debe ser un número o un string numérico.');
  } else {
    const asString = String(rawCost).trim();
    const numericValue = Number(asString);
    const isNumericValue = Number.isFinite(numericValue);

    if (typeof rawCost === 'number' && (!isNumericValue || Math.abs(rawCost) > MAX_MONEY_VALUE_NUMBER)) {
      errors.push('El insumo no puede superar $99.999.999,99.');
    } else {
      const isNumericFormat = /^-?\d+(\.\d+)?$/.test(asString);
      if (!isNumericFormat && !isNumericValue) {
        errors.push('El campo "currentCost" debe ser un valor decimal válido (ej: "742.98").');
      } else {
        try {
          const decimalValue = new Prisma.Decimal(asString);
          if (decimalValue.lessThanOrEqualTo(0)) {
            errors.push('El campo "currentCost" debe ser mayor a cero.');
          } else if (decimalValue.abs().greaterThan(MAX_MONEY_VALUE) || Math.abs(numericValue) > MAX_MONEY_VALUE_NUMBER) {
            errors.push('El insumo no puede superar $99.999.999,99.');
          } else {
            currentCost = decimalValue;
          }
        } catch {
          errors.push('El campo "currentCost" debe ser un valor decimal válido.');
        }
      }
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
    select: { id: true, currentCost: true },
  });

  if (!existing) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  const { name, unit, currentCost } = parseIngredientInput(req.body as IngredientInputDTO);
  const nextCost = new Prisma.Decimal(currentCost.toString());
  const previousCost = existing.currentCost ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.update({
      where: { id },
      data: { name, unit, currentCost },
    });

    await applyIngredientCostChange(tx, id, previousCost, nextCost);

    return ingredient;
  });

  return res.status(200).json({ ingredient: updated });
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