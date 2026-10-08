import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { blockCollaboratorMutations, requireRole, sanitizeFinancialData } from '../middlewares/rbac';
import { parsePaginationParams } from '../utils/pagination';
import { applyIngredientCostChange } from '../services/marginCalculator';

const router = Router();

// Todas las rutas de este router requieren un usuario autenticado.
// Por eso `req.user!` se usa sin chequeo adicional en cada handler: si
// authMiddleware llamó a next(), req.user está garantizado seteado.
router.use(authMiddleware);
router.use(blockCollaboratorMutations);
router.use(sanitizeFinancialData);

/**
 * Express 5 (path-to-regexp v7+) tipa los parámetros de ruta como
 * `string | string[] | undefined` para soportar rutas con parámetros
 * repetidos. Nuestras rutas usan siempre un único `:id`, por lo que
 * normalizamos a `string` para satisfacer los tipos de Prisma
 * (`IngredientWhereUniqueInput.id: string`).
 */
function getIdParam(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) {
    return rawId[0] ?? '';
  }
  return rawId ?? '';
}

/* ------------------------------------------------------------------ */
/* Tipos y utilidades de validación                                    */
/* ------------------------------------------------------------------ */

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

/**
 * Valida el payload de entrada para creación/actualización de un insumo.
 * Devuelve { data } si es válido, o { errors } con la lista de mensajes
 * de validación (uno por campo). La ruta que llama a esta función decide
 * cómo comunicar esos errores — ver nota en el criterio de aceptación
 * del middleware global de errores.
 */
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

/**
 * Ejecuta la validación y, si falla, lanza un AppError con TODOS los
 * mensajes unidos en un solo string — así el error de payload pasa por
 * el middleware global y respeta el formato uniforme {"error": "..."}
 * en lugar de responder directo
 * con un array desde la ruta.
 */
function parseIngredientInput(body: IngredientInputDTO): ValidatedIngredientInput {
  const validation = validateIngredientInput(body);
  if ('errors' in validation) {
    throw new AppError(validation.errors.join(' '), 400);
  }
  return validation.data;
}

/* ------------------------------------------------------------------ */
/* GET /api/ingredients                                                */
/* Lista los insumos de la cuenta autenticada, paginados y ordenados.  */
/* Query params: page, limit, sortBy (name|currentCost|updatedAt),     */
/* order (asc|desc). Todos opcionales, con defaults seguros.           */
/* 200 OK | 401 No autenticado | 500 (vía errorHandler)                */
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

  // La paginación se resuelve en la base de datos (skip/take), no en
  // memoria de Node. Se ejecutan ambas consultas en paralelo.
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
/* Detalle de un insumo, filtrado por cuenta.                          */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  // findFirst con accountId en el where: nunca se revela si el registro
  // existe en OTRA cuenta (siempre 404, sin distinguir el motivo).
  const ingredient = await prisma.ingredient.findFirst({
    where: { id, accountId },
  });

  if (!ingredient) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  return res.status(200).json({ ingredient });
});

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
/* Crea un insumo asignando accountId automáticamente.                 */
/* 201 Created | 400 Validación fallida | 401 No autenticado | 500     */
/* ------------------------------------------------------------------ */
router.post('/', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  // req.body es `any` por diseño de Express; el cast a IngredientInputDTO es
  // seguro porque cada campo del DTO es `unknown` (no asume estructura) y se
  // valida explícitamente en validateIngredientInput antes de usarse.
  const { name, unit, currentCost } = parseIngredientInput(req.body as IngredientInputDTO);

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      unit,
      currentCost,
      accountId, // Siempre se asigna desde req.user, nunca desde el body.
    },
  });

  return res.status(201).json({ ingredient });
});

/* ------------------------------------------------------------------ */
/* PUT /api/ingredients/:id                                            */
/* Actualiza un insumo, con idénticas validaciones que el alta.        */
/* 200 OK | 400 Validación fallida | 401 No autenticado                */
/* 404 No encontrado/ajeno | 500                                       */
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

  // Transacción: actualiza el insumo y recalcula en cascada el costo/margen
  // de todos los productos que lo usan en su receta.
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
/* Elimina un insumo, asegurando integridad referencial a nivel de     */
/* aplicación (Regla de negocio 1.8): la FK usa onDelete: Cascade,     */
/* por lo que la base de datos NO impide el borrado por sí sola. Se    */
/* consulta previamente si el insumo está en uso en ProductIngredient  */
/* y, de estarlo, se rechaza la operación devolviendo el listado de    */
/* productos afectados (respuesta enriquecida a propósito, no es un    */
/* error genérico del middleware global — ver nota más abajo).         */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno               */
/* 409 Conflicto (insumo usado en una o más recetas activas) | 500     */
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

  // Regla de negocio 1.8: consultar previamente si el insumo está en uso.
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