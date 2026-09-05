import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

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
 * Devuelve { data } si es válido, o { errors } con la lista de mensajes.
 */
function validateIngredientInput(
  body: IngredientInputDTO
): { data: ValidatedIngredientInput } | { errors: string[] } {
  const errors: string[] = [];

  // --- name: string no vacío ---
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    errors.push('El campo "name" es obligatorio y debe ser un texto no vacío.');
  }

  // --- unit: kg | l | u ---
  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  if (!VALID_UNITS.includes(unit as Unit)) {
    errors.push(`El campo "unit" debe ser uno de: ${VALID_UNITS.join(', ')}.`);
  }

  // --- currentCost: decimal > 0 ---
  // Se acepta string o number, pero debe representar un número válido y positivo.
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
    // Solo dígitos, opcionalmente con un separador decimal (evita "abc", "1e10", etc).
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

/* ------------------------------------------------------------------ */
/* GET /api/ingredients                                                */
/* Lista los insumos de la cuenta autenticada.                         */
/* 200 OK | 401 No autenticado | 500 Error interno                     */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accountId = req.user!.accountId;

    const ingredients = await prisma.ingredient.findMany({
      where: { accountId },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ ingredients });
  } catch (err) {
    console.error('[GET /api/ingredients] Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ------------------------------------------------------------------ */
/* GET /api/ingredients/:id                                            */
/* Detalle de un insumo, filtrado por cuenta.                          */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500 Error   */
/* ------------------------------------------------------------------ */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const id = getIdParam(req.params.id);
    if (!id) {
      return res.status(404).json({ error: 'Insumo no encontrado.' });
    }

    // findFirst con accountId en el where: nunca se revela si el registro
    // existe en OTRA cuenta (siempre 404, sin distinguir el motivo).
    const ingredient = await prisma.ingredient.findFirst({
      where: { id, accountId },
    });

    if (!ingredient) {
      return res.status(404).json({ error: 'Insumo no encontrado.' });
    }

    return res.status(200).json({ ingredient });
  } catch (err) {
    console.error('[GET /api/ingredients/:id] Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/ingredients                                               */
/* Crea un insumo asignando accountId automáticamente.                 */
/* 201 Created | 400 Validación fallida | 401 No autenticado | 500     */
/* ------------------------------------------------------------------ */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const validation = validateIngredientInput(req.body as IngredientInputDTO);

    if ('errors' in validation) {
      return res.status(400).json({ errors: validation.errors });
    }

    const { name, unit, currentCost } = validation.data;

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        currentCost,
        accountId, // Siempre se asigna desde req.user, nunca desde el body.
      },
    });

    return res.status(201).json({ ingredient });
  } catch (err) {
    console.error('[POST /api/ingredients] Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ------------------------------------------------------------------ */
/* PUT /api/ingredients/:id                                            */
/* Actualiza un insumo, con idénticas validaciones que el alta.        */
/* 200 OK | 400 Validación fallida | 401 No autenticado                */
/* 404 No encontrado/ajeno | 500 Error interno                         */
/* ------------------------------------------------------------------ */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.is('application/json')) {
    return res.status(400).json({ errors: ['El header Content-Type debe ser application/json.'] });
  }
  
  try {
    const accountId = req.user!.accountId;
    const id = getIdParam(req.params.id);
    if (!id) {
      return res.status(404).json({ error: 'Insumo no encontrado.' });
    }

    // 1) Verificar pertenencia ANTES de validar/actualizar, para no filtrar
    //    información de insumos ajenos ni permitir su modificación.
    const existing = await prisma.ingredient.findFirst({
      where: { id, accountId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Insumo no encontrado.' });
    }

    // 2) Validar payload.
    const validation = validateIngredientInput(req.body as IngredientInputDTO);
    if ('errors' in validation) {
      return res.status(400).json({ errors: validation.errors });
    }

    const { name, unit, currentCost } = validation.data;

    // 3) Pertenencia ya verificada arriba; no se refiltra por accountId aquí.
    const updated = await prisma.ingredient.update({
      where: { id },
      data: { name, unit, currentCost },
    });

    return res.status(200).json({ ingredient: updated });
  } catch (err) {
    console.error('[PUT /api/ingredients/:id] Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ------------------------------------------------------------------ */
/* DELETE /api/ingredients/:id                                         */
/* Elimina un insumo, asegurando integridad referencial a nivel de     */
/* aplicación (Regla de negocio 1.8): la FK usa onDelete: Cascade,     */
/* por lo que la base de datos NO impide el borrado por sí sola. Se    */
/* consulta previamente si el insumo está en uso en ProductIngredient  */
/* y, de estarlo, se rechaza la operación devolviendo el listado de    */
/* productos afectados.                                                */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno               */
/* 409 Conflicto (insumo usado en una o más recetas activas) | 500     */
/* ------------------------------------------------------------------ */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const id = getIdParam(req.params.id);
    if (!id) {
      return res.status(404).json({ error: 'Insumo no encontrado.' });
    }

    const existing = await prisma.ingredient.findFirst({
      where: { id, accountId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Insumo no encontrado.' });
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
  } catch (err) {
    console.error('[DELETE /api/ingredients/:id] Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default router;