import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { applyIngredientCostChange, calculateUnitCost } from '../services/marginCalculator';
import { requireRole } from '../middlewares/rbac';

const router = Router();
router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

function getIdParam(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) {
    return rawId[0] ?? '';
  }
  return rawId ?? '';
}

interface SupplierInputDTO {
  name?: unknown;
  contactPhone?: unknown;
  email?: unknown;
  address?: unknown;
  isActive?: unknown;
}

function normalizeOptionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || null;
  }

  throw new AppError(`El campo "${field}" debe ser un texto.`, 400);
}

function parseSupplierInput(body: SupplierInputDTO) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    throw new AppError('El campo "name" es obligatorio.', 400);
  }

  const contactPhone = normalizeOptionalText(body.contactPhone, 'contactPhone');

  const email = normalizeOptionalText(body.email, 'email');
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('El campo "email" debe tener un formato válido.', 400);
  }

  const address = normalizeOptionalText(body.address, 'address');

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    throw new AppError('El campo "isActive" debe ser booleano.', 400);
  }

  const isActive = body.isActive === undefined ? true : body.isActive;

  return {
    name,
    contactPhone,
    email,
    address,
    isActive,
  };
}

function parseSupplierIngredientDecimal(value: unknown, field: string): Prisma.Decimal {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new AppError(`El campo "${field}" es obligatorio.`, 400);
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AppError(`El campo "${field}" debe ser un número o un string numérico.`, 400);
  }

  const asText = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(asText)) {
    throw new AppError(`El campo "${field}" debe ser un valor decimal válido.`, 400);
  }

  const decimalValue = new Prisma.Decimal(asText);
  const maxValue = new Prisma.Decimal('99999999.99');
  const numericValue = Number(asText);

  if (!Number.isFinite(numericValue) || Math.abs(numericValue) > Number(maxValue.toString())) {
    throw new AppError(`El campo "${field}" no puede superar $99.999.999,99.`, 400);
  }

  return decimalValue;
}

/* ------------------------------------------------------------------ */
/* GET /api/suppliers                                                   */
/* Lista los proveedores de la cuenta autenticada.                     */
/* 200 OK | 401 No autenticado | 500                                     */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const suppliers = await prisma.supplier.findMany({
    where: { accountId },
    orderBy: { name: 'asc' },
  });

  return res.status(200).json({ suppliers });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers                                                  */
/* Crea un proveedor asignando accountId automáticamente.             */
/* 201 Created | 400 Validación fallida | 401 No autenticado | 409 Duplicado | 500 */
/* ------------------------------------------------------------------ */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const payload = req.body && typeof req.body === 'object' ? (req.body as SupplierInputDTO) : {};
  const data = parseSupplierInput(payload);

  const existing = await prisma.supplier.findFirst({
    where: { accountId, name: { equals: data.name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new AppError('Ya existe un proveedor con ese nombre.', 409);
  }

  const supplier = await prisma.supplier.create({
    data: {
      ...data,
      accountId,
    },
  });

  return res.status(201).json({ supplier });
});

/* ------------------------------------------------------------------ */
/* GET /api/suppliers/:id                                              */
/* Detalle de un proveedor, filtrado por cuenta.                       */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id, accountId },
  });

  if (!supplier) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  return res.status(200).json({ supplier });
});

/* ------------------------------------------------------------------ */
/* PUT /api/suppliers/:id                                              */
/* Actualiza un proveedor, filtrado por cuenta y mergeando campos.      */
/* 200 OK | 400 Validación fallida | 401 No autenticado | 404 No encontrado/ajeno | 500 */
/* ------------------------------------------------------------------ */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.is('application/json')) {
    throw new AppError('El header Content-Type debe ser application/json.', 400);
  }

  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const existing = await prisma.supplier.findFirst({
    where: { id, accountId },
  });

  if (!existing) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const payload = req.body && typeof req.body === 'object' ? (req.body as SupplierInputDTO) : {};
  const merged = {
    name: existing.name,
    contactPhone: existing.contactPhone,
    email: existing.email,
    address: existing.address,
    isActive: existing.isActive,
    ...payload,
  };
  const data = parseSupplierInput(merged);

  if (data.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.supplier.findFirst({
      where: { accountId, name: { equals: data.name, mode: 'insensitive' } },
    });

    if (duplicate) {
      throw new AppError('Ya existe un proveedor con ese nombre.', 409);
    }
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data,
  });

  return res.status(200).json({ supplier });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers/:id/ingredients                                  */
/* Asocia o actualiza un insumo con presentación mayorista (Upsert).    */
/* 200 OK (actualizado) | 201 Created (nuevo) | 400 | 401 | 404 | 500  */
/* ------------------------------------------------------------------ */
router.post('/:id/ingredients', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const supplierId = getIdParam(req.params.id);
  if (!supplierId) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, accountId },
    select: { id: true },
  });

  if (!supplier) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const payload = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const { ingredientId: rawIngredientId, packageSize, packageUnit, packagePrice, isDefault, accountId: _ignored } = payload;

  if (typeof rawIngredientId !== 'string' || rawIngredientId.trim() === '') {
    throw new AppError('El campo "ingredientId" es obligatorio.', 400);
  }

  const ingredientId = rawIngredientId.trim();
  const parsedPackageSize = parseSupplierIngredientDecimal(packageSize, 'packageSize');
  if (parsedPackageSize.lte(0)) {
    throw new AppError('El campo "packageSize" debe ser mayor a cero.', 400);
  }

  const parsedPackagePrice = parseSupplierIngredientDecimal(packagePrice, 'packagePrice');
  if (parsedPackagePrice.lte(0)) {
    throw new AppError('El campo "packagePrice" debe ser mayor a cero.', 400);
  }

  if (typeof packageUnit !== 'string' || packageUnit.trim() === '') {
    throw new AppError('El campo "packageUnit" es obligatorio.', 400);
  }

  const normalizedPackageUnit = packageUnit.trim();
  const validUnits = ['kg', 'l', 'u'] as const;
  if (!validUnits.includes(normalizedPackageUnit as (typeof validUnits)[number])) {
    throw new AppError('El campo "packageUnit" debe ser uno de: kg, l, u.', 400);
  }

  if (typeof isDefault !== 'undefined' && typeof isDefault !== 'boolean') {
    throw new AppError('El campo "isDefault" debe ser booleano.', 400);
  }

  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, accountId },
    select: { id: true, unit: true, currentCost: true },
  });

  if (!ingredient) {
    throw new AppError('Insumo no encontrado.', 404);
  }

  if (ingredient.unit !== normalizedPackageUnit) {
    throw new AppError(`El campo "packageUnit" debe coincidir con la unidad del insumo (${ingredient.unit}).`, 400);
  }

  // Comportamiento de Upsert: verificamos si ya existía la presentación
  const existingAssociation = await prisma.supplierIngredient.findFirst({
    where: { supplierId, ingredientId },
    select: { id: true, isDefault: true },
  });

  const isUpdate = Boolean(existingAssociation);
  const statusCode = isUpdate ? 200 : 201;

  let unitCost: Prisma.Decimal;
  try {
    unitCost = calculateUnitCost(parsedPackagePrice, parsedPackageSize);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'No se pudo calcular el costo unitario.',
      400
    );
  }

  const associationData = {
    packageSize: parsedPackageSize,
    packageUnit: normalizedPackageUnit,
    packagePrice: parsedPackagePrice,
    isDefault: Boolean(isDefault),
  };

  if (!isDefault) {
    const supplierIngredient = existingAssociation
      ? await prisma.supplierIngredient.update({
          where: { id: existingAssociation.id },
          data: associationData,
        })
      : await prisma.supplierIngredient.create({
          data: {
            supplierId,
            ingredientId,
            ...associationData,
          },
        });

    return res.status(statusCode).json({ supplierIngredient, unitCost, ingredient });
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const supplierIngredient = existingAssociation
      ? await tx.supplierIngredient.update({
          where: { id: existingAssociation.id },
          data: associationData,
        })
      : await tx.supplierIngredient.create({
          data: {
            supplierId,
            ingredientId,
            ...associationData,
          },
        });

    if (typeof tx.supplierIngredient.updateMany === 'function') {
      await tx.supplierIngredient.updateMany({
        where: { ingredientId, id: { not: supplierIngredient.id } },
        data: { isDefault: false },
      });
    }

    const finder = tx.ingredient.findUnique ?? tx.ingredient.findFirst;
    const ingredientOnTx = await finder.call(tx.ingredient, {
      where: { id: ingredientId },
      select: { id: true, currentCost: true },
    });

    if (!ingredientOnTx) {
      throw new AppError('Insumo no encontrado.', 404);
    }

    const previousCost = ingredientOnTx.currentCost;
    const updatedIngredient = await tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentCost: unitCost },
    });

    await applyIngredientCostChange(tx, ingredientId, previousCost, unitCost);

    return {
      supplierIngredient,
      ingredient: updatedIngredient,
      unitCost,
    };
  });

  return res.status(statusCode).json({
    supplierIngredient: result.supplierIngredient,
    unitCost: result.unitCost,
    ingredient: result.ingredient,
  });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/suppliers/:id                                            */
/* Elimina un proveedor. SupplierIngredient se elimina en cascada pero los insumos NO. */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const existing = await prisma.supplier.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  await prisma.supplier.delete({ where: { id } });

  return res.status(200).json({ message: 'Proveedor eliminado correctamente.' });
});

export default router;