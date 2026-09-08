import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// Todas las rutas de este router requieren un usuario autenticado.
router.use(authMiddleware);

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
    const isNumericFormat = /^-?\d+(\.\d+)?$/.test(asString);

    if (!isNumericFormat) {
      errors.push('El campo "currentCost" debe ser un valor decimal válido (ej: "742.98").');
    } else {
      try {
        const decimalValue = new Prisma.Decimal(asString);
        if (decimalValue.lessThanOrEqualTo(0)) {
          errors.push('El campo "currentCost" debe ser mayor a cero.');
        } else {
          currentCost = decimalValue;
        }
      } catch {
        errors.push('El campo "currentCost" debe ser un valor decimal válido.');
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
/* Lista los insumos de la cuenta autenticada.                         */
/* 200 OK | 401 No autenticado | 500 (vía errorHandler)                */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const ingredients = await prisma.ingredient.findMany({
    where: { accountId },
    orderBy: { name: 'asc' },
  });

  return res.status(200).json({ ingredients });
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

/* ------------------------------------------------------------------ */
/* POST /api/ingredients                                               */
/* Crea un insumo asignando accountId automáticamente.                 */
/* 201 Created | 400 Validación fallida | 401 No autenticado | 500     */
/* ------------------------------------------------------------------ */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
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
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.is('application/json')) {
    throw new AppError('El header Content-Type debe ser application/json.', 400);
  }

  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  // 1) Verificar pertenencia ANTES de validar/actualizar, para no filtrar
  //    información de insumos ajenos ni permitir su modificación.
  const existing = await prisma.ingredient.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  // 2) Validar payload (lanza AppError con 400 si falla).
  const { name, unit, currentCost } = parseIngredientInput(req.body as IngredientInputDTO);

  // 3) Pertenencia ya verificada arriba; no se refiltra por accountId aquí.
  const updated = await prisma.ingredient.update({
    where: { id },
    data: { name, unit, currentCost },
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
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
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