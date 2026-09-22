import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

type DecimalType = Prisma.Decimal;

/**
 * Calculadora pura de costos y márgenes usando Prisma.Decimal
 * Todas las salidas quedan redondeadas a 2 decimales con ROUND_HALF_UP
 */
export function calculateItemCost(quantity: DecimalType, unitCost: DecimalType): DecimalType {
  const zero = new Decimal(0);
  if (!quantity || !unitCost) return zero.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (quantity.lte(0) || unitCost.lte(0)) return zero.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const raw = unitCost.mul(quantity);
  return raw.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculateRecipeTotal(items: Array<{ quantity: DecimalType; unitCost: DecimalType }>): DecimalType {
  const zero = new Decimal(0);
  if (!Array.isArray(items) || items.length === 0) return zero.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const total = items.reduce((acc, it) => {
    const q = it.quantity ?? zero;
    const u = it.unitCost ?? zero;
    return acc.add(u.mul(q));
  }, zero);

  return total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculateMarginAmount(salePrice: DecimalType, totalCost: DecimalType): DecimalType {
  const zero = new Decimal(0);
  if (!salePrice || !totalCost) return zero.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const amount = salePrice.sub(totalCost);
  return amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculateMarginPercent(salePrice: DecimalType, totalCost: DecimalType): DecimalType {
  const zero = new Decimal(0);
  if (!salePrice || salePrice.lte(0)) return zero.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (!totalCost) return zero.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  // Interpret totalCost.isZero() as "no ingredients" for safety
  if (totalCost.isZero()) return zero.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const margin = salePrice.sub(totalCost).div(salePrice).mul(100);
  return margin.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export default {
  calculateItemCost,
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
};
