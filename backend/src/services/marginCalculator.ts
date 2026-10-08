import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

type DecimalType = Prisma.Decimal;

const ZERO = new Decimal(0);
const MAX_MONEY_VALUE = new Decimal('99999999.99');
const MIN_MONEY_VALUE = new Decimal('-99999999.99');
// El campo de margen porcentual en Prisma admite hasta 8 enteros + 2 decimales.
// Un literal como '999.999.99' es inválido para Decimal.js y rompe la carga del módulo.
const MAX_PERCENT_VALUE = new Decimal('999999.99');
const MIN_PERCENT_VALUE = new Decimal('-999999.99');

function clampDecimal(value: DecimalType, min: DecimalType, max: DecimalType): DecimalType {
  if (value.lessThan(min)) return min;
  if (value.greaterThan(max)) return max;
  return value;
}

/** Redondea a 2 decimales con ROUND_HALF_UP (estándar para moneda). */
function roundMoney(value: DecimalType): DecimalType {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
/**
 * Calculadora pura de costos y márgenes usando Prisma.Decimal
 * Todas las salidas quedan redondeadas a 2 decimales con ROUND_HALF_UP
 */
/**
 * Costo de un ítem de receta = cantidad usada × costo unitario.
 * Cantidad o costo inválidos (<= 0) no aportan costo.
 */
export function calculateItemCost(quantity: DecimalType, unitCost: DecimalType): DecimalType {
  if (quantity.lte(0) || unitCost.lte(0)) return roundMoney(ZERO);
  return roundMoney(unitCost.mul(quantity));
}

/**
 * Costo unitario derivado de la presentación mayorista del proveedor.
 * packagePrice / packageSize, redondeado a 2 decimales con ROUND_HALF_UP.
 */
export function calculateUnitCost(packagePrice: DecimalType, packageSize: DecimalType): DecimalType {
  if (packageSize.lte(0)) {
    throw new Error('El campo "packageSize" debe ser mayor a cero.');
  }

  if (packagePrice.lte(0)) {
    throw new Error('El campo "packagePrice" debe ser mayor a cero.');
  }

  const unitCost = packagePrice.div(packageSize).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (unitCost.lte(0)) {
    throw new Error('El costo unitario calculado debe ser mayor a cero.');
  }
  if (unitCost.greaterThan(MAX_MONEY_VALUE)) {
    throw new Error('El costo unitario calculado no puede superar $99.999.999,99.');
  }

  return unitCost;
}

/**
 * Costo total de una receta = suma de calculateItemCost de cada ítem.
 * Sin ítems (producto sin ingredientes) => 0.00.
 */
export function calculateRecipeTotal(
  items: Array<{ quantity: DecimalType; unitCost: DecimalType }>
): DecimalType {
  if (!Array.isArray(items) || items.length === 0) return roundMoney(ZERO);

  const total = items.reduce(
    (acc, item) => acc.add(calculateItemCost(item.quantity, item.unitCost)),
    ZERO
  );
  const rounded = roundMoney(total);
  return clampDecimal(rounded, MIN_MONEY_VALUE, MAX_MONEY_VALUE);
}

/**
 * Margen nominal = salePrice - totalCost.
 * Sin ingredientes (totalCost === 0) => 0.00, sin importar salePrice.
 * OJO: si HAY ingredientes pero salePrice es 0 (borrador), el margen da
 * negativo a propósito — ver Gherkin: costo $1500, venta $0 => -$1500.00.
 * A diferencia de calculateMarginPercent, acá NO se guarda por salePrice<=0.
 */
export function calculateMarginAmount(salePrice: DecimalType, totalCost: DecimalType): DecimalType {
  if (totalCost.isZero()) return roundMoney(ZERO);
  const margin = roundMoney(salePrice.sub(totalCost));
  return clampDecimal(margin, MIN_MONEY_VALUE, MAX_MONEY_VALUE);
}

/**
 * Margen porcentual = (salePrice - totalCost) / salePrice × 100.
 * salePrice <= 0 o sin ingredientes => 0.00% (evita división por cero).
 */
export function calculateMarginPercent(salePrice: DecimalType, totalCost: DecimalType): DecimalType {
  if (salePrice.lte(0) || totalCost.isZero()) return roundMoney(ZERO);
  const percent = roundMoney(salePrice.sub(totalCost).div(salePrice).mul(100));
  return clampDecimal(percent, MIN_PERCENT_VALUE, MAX_PERCENT_VALUE);
}

export async function applyIngredientCostChange(
  tx: any,
  ingredientId: string,
  previousCost: DecimalType | null,
  newCost: DecimalType
): Promise<void> {
  const ingredientFinder = tx.ingredient.findUnique ?? tx.ingredient.findFirst;
  const oldCost =
    previousCost ??
    (ingredientFinder && typeof ingredientFinder === 'function'
      ? (await ingredientFinder.call(tx.ingredient, {
          where: { id: ingredientId },
          select: { currentCost: true },
        }))?.currentCost ?? null
      : null);

  if (oldCost && !oldCost.equals(newCost)) {
    await tx.priceHistory.create({
      data: {
        ingredientId,
        oldCost,
        newCost,
      },
    });
  }

  const affected = await tx.productIngredient.findMany({
    where: { ingredientId },
    select: { productId: true },
  });
  const productIds = [...new Set(affected.map((a: { productId: string }) => a.productId))];

  for (const productId of productIds) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { ingredients: { include: { ingredient: { select: { currentCost: true } } } } },
    });
    if (!product) continue;

    const cost = calculateRecipeTotal(
      product.ingredients.map((pi: { quantity: DecimalType; ingredient: { currentCost: DecimalType } }) => ({
        quantity: pi.quantity,
        unitCost: pi.ingredient.currentCost,
      }))
    );

    await tx.product.update({
      where: { id: productId },
      data: {
        cost,
        marginAmount: calculateMarginAmount(product.salePrice, cost),
        marginPercent: calculateMarginPercent(product.salePrice, cost),
      },
    });
  }
}

export default {
  calculateItemCost,
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  calculateUnitCost,
  applyIngredientCostChange,
};
