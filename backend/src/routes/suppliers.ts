import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import {
  applyIngredientCostChange,
  calculateUnitCost,
  type CriticalMarginProduct,
} from '../services/marginCalculator';
import { requireRole } from '../middlewares/rbac';
import { dispatchMarginAlertEvent } from '../services/marginAlertDispatcher';

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

// Escala y tope de cada columna de SupplierIngredient (schema.prisma).
const SUPPLIER_INGREDIENT_DECIMAL_SPECS = {
  // packageSize es Decimal(10,3): 7 enteros y 3 decimales.
  packageSize: { decimals: 3, regex: /^-?\d+(\.\d{1,3})?$/, max: new Prisma.Decimal('9999999.999'), maxLabel: '9.999.999,999', example: '25.500' },
  // packagePrice es Decimal(10,2): 8 enteros y 2 decimales.
  packagePrice: { decimals: 2, regex: /^-?\d+(\.\d{1,2})?$/, max: new Prisma.Decimal('99999999.99'), maxLabel: '$99.999.999,99', example: '35000.50' },
} as const;

function parseSupplierIngredientDecimal(
  value: unknown,
  field: keyof typeof SUPPLIER_INGREDIENT_DECIMAL_SPECS
): Prisma.Decimal {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new AppError(`El campo "${field}" es obligatorio.`, 400);
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new AppError(`El campo "${field}" debe ser un número o un string numérico.`, 400);
  }

  const asText = String(value).trim();
  const spec = SUPPLIER_INGREDIENT_DECIMAL_SPECS[field];
  if (!spec.regex.test(asText)) {
    throw new AppError(
      `El campo "${field}" debe ser un valor decimal válido con hasta ${spec.decimals} decimales (ej: "${spec.example}").`,
      400
    );
  }

  const decimalValue = new Prisma.Decimal(asText);
  if (decimalValue.abs().greaterThan(spec.max)) {
    throw new AppError(`El campo "${field}" no puede superar ${spec.maxLabel}.`, 400);
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
/* GET /api/suppliers/quarantine                                       */
/* Lista los precios de proveedores en cuarentena para la cuenta del   */
/* administrador autenticado.                                          */
/* 200 OK | 401 No autenticado | 500                                     */
/* ------------------------------------------------------------------ */
router.get('/quarantine', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const quarantined = await prisma.supplierIngredient.findMany({
    where: {
      ingredient: { accountId },
      isQuarantined: true,
    },
    include: {
      ingredient: { select: { id: true, name: true, currentCost: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  });

  const normalized = quarantined.map((row) => {
    const currentPrice = new Prisma.Decimal(String(row.packagePrice ?? 0));
    const proposedPrice = new Prisma.Decimal(String(row.pendingPackagePrice ?? row.packagePrice ?? 0));
    const variationPercent = currentPrice.gt(0)
      ? proposedPrice.sub(currentPrice).div(currentPrice).mul(100).abs().toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal('0.00');

    return {
      ...row,
      currentPrice: currentPrice.toString(),
      proposedPrice: proposedPrice.toString(),
      variationPercent: variationPercent.toString(),
      quarantineReason: row.quarantineReason ?? 'SIN_MOTIVO',
    };
  });

  return res.status(200).json({ quarantined: normalized });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers/quarantine/:id/release                          */
/* Libera un precio anómalo de cuarentena y, si corresponde, aplica    */
/* el costo unitario del proveedor como nuevo costo activo del insumo.   */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.post('/quarantine/:id/release', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);

  if (!id) {
    throw new AppError('Precio en cuarentena no encontrado.', 404);
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const quarantined = await tx.supplierIngredient.findFirst({
      where: { id, ingredient: { accountId }, isQuarantined: true },
      include: { ingredient: { select: { id: true, name: true, currentCost: true } } },
    });

    if (!quarantined) {
      throw new AppError('Precio en cuarentena no encontrado.', 404);
    }

    const proposedPrice = quarantined.pendingPackagePrice ?? quarantined.packagePrice;

    if (!proposedPrice) {
      throw new AppError('No hay un precio pendiente para liberar.', 409);
    }

    let unitCost: Prisma.Decimal;
    try {
      unitCost = calculateUnitCost(proposedPrice, quarantined.packageSize);
    } catch (_error) {
      throw new AppError('El costo unitario calculado es inválido para este precio.', 422);
    }

    const updatedSupplierIngredient = await tx.supplierIngredient.update({
      where: { id },
      data: {
        packagePrice: proposedPrice,
        pendingPackagePrice: null,
        isQuarantined: false,
        quarantinedAt: null,
        quarantineReason: null,
      },
    });

    let affectedProductsCount = 0;
    let affectedProducts: unknown[] = [];
    let criticalProducts: CriticalMarginProduct[] = [];

    if (quarantined.isDefault) {
      const finder = tx.ingredient.findUnique ?? tx.ingredient.findFirst;
      const ingredientOnTx = await finder.call(tx.ingredient, {
        where: { id: quarantined.ingredientId },
        select: { id: true, name: true, currentCost: true },
      });

      if (!ingredientOnTx) {
        throw new AppError('Insumo no encontrado.', 404);
      }

      const previousCost = ingredientOnTx.currentCost;
      await tx.ingredient.update({
        where: { id: quarantined.ingredientId },
        data: { currentCost: unitCost },
      });
      const currentResult = await applyIngredientCostChange(tx, quarantined.ingredientId, previousCost, unitCost);
      affectedProductsCount = currentResult.affectedProductsCount;
      affectedProducts = currentResult.affectedProducts;
      criticalProducts = currentResult.criticalProducts;
    }

    return {
      ingredientId: quarantined.ingredientId,
      ingredientName: quarantined.ingredient.name,
      supplierIngredient: updatedSupplierIngredient,
      unitCost,
      affectedProductsCount,
      affectedProducts,
      criticalProducts,
    };
  });

  if (result.criticalProducts.length > 0) {
    void dispatchMarginAlertEvent({
      accountId,
      ingredientId: result.ingredientId,
      ingredientName: result.ingredientName,
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
    supplierIngredient: result.supplierIngredient,
    unitCost: result.unitCost,
    affectedProductsCount: result.affectedProductsCount,
    affectedProducts: result.affectedProducts,
    criticalProducts: result.criticalProducts,
  });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers/quarantine/:id/reject                           */
/* Rechaza un precio anómalo y lo remueve de cuarentena sin tocar el    */
/* costo activo del insumo.                                             */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.post('/quarantine/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);

  if (!id) {
    throw new AppError('Precio en cuarentena no encontrado.', 404);
  }

  const quarantined = await prisma.supplierIngredient.findFirst({
    where: { id, ingredient: { accountId }, isQuarantined: true },
  });

  if (!quarantined) {
    throw new AppError('Precio en cuarentena no encontrado.', 404);
  }

  const supplierIngredient = await prisma.supplierIngredient.update({
    where: { id },
    data: {
      pendingPackagePrice: null,
      isQuarantined: false,
      quarantinedAt: null,
      quarantineReason: null,
    },
  });

  return res.status(200).json({
    supplierIngredient,
    message: 'Precio anómalo rechazado y mantenido en el costo anterior.',
  });
});

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
    if (existingAssociation && existingAssociation.isDefault) {
      throw new AppError('No puedes quitar el proveedor predeterminado sin asignar otro. Marca otro proveedor como predeterminado para reemplazarlo.', 422);
    }
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
      select: { id: true, name: true, currentCost: true },
    });

    if (!ingredientOnTx) {
      throw new AppError('Insumo no encontrado.', 404);
    }

    const previousCost = ingredientOnTx.currentCost;
    const updatedIngredient = await tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentCost: unitCost },
    });

    const { affectedProductsCount, criticalProducts } = await applyIngredientCostChange(
      tx,
      ingredientId,
      previousCost,
      unitCost
    );

    return {
      supplierIngredient,
      ingredient: updatedIngredient,
      unitCost,
      affectedProductsCount,
      criticalProducts,
    };
  });

  if (result.criticalProducts.length > 0) {
    void dispatchMarginAlertEvent({
      accountId,
      ingredientId,
      ingredientName: result.ingredient.name ?? 'Insumo',
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