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

export interface ProductCostImpact {
  productId: string;
  productName: string;
  previousCost: DecimalType;
  newCost: DecimalType;
  currentMarginPercent: DecimalType;
  minMarginPercent: DecimalType;
}

export interface CriticalMarginProduct extends ProductCostImpact { }

export type HealthBucket = 'loss' | 'risk' | 'target' | 'surplus' | 'draft';

const SURPLUS_MARGIN_THRESHOLD = new Decimal(60);

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

/**
 * Clasifica un producto en su bucket de salud financiera usando su propio
 * `minMarginPercent` (no el umbral global de la cuenta):
 * - draft: sin ingredientes en su receta
 * - loss: con receta y marginPercent < 0
 * - risk: con receta y 0 <= marginPercent < minMarginPercent
 * - target: con receta y minMarginPercent <= marginPercent <= 60
 * - surplus: con receta y marginPercent >= minMarginPercent y marginPercent > 60
 */
export function classifyProductHealthBucket(
  marginPercent: DecimalType,
  minMarginPercent: DecimalType,
  ingredientsCount: number
): HealthBucket {
  if (ingredientsCount <= 0) return 'draft';
  if (marginPercent.lessThan(ZERO)) return 'loss';
  if (marginPercent.lessThan(minMarginPercent)) return 'risk';
  if (marginPercent.lessThanOrEqualTo(SURPLUS_MARGIN_THRESHOLD)) return 'target';
  return 'surplus';
}

/**
 * Calcula la mediana del margen porcentual de los productos activos (no borradores).
 * Medida robusta frente a precios o costos extremos mal cargados.
 * Devuelve 0.00 si la lista está vacía.
 */
export function calculateMedianMarginPercent(margins: DecimalType[]): DecimalType {
  if (!Array.isArray(margins) || margins.length === 0) {
    return roundMoney(ZERO);
  }

  const sorted = [...margins].sort((a, b) => a.comparedTo(b));
  const mid = Math.floor(sorted.length / 2);
  const middle = sorted[mid] ?? ZERO;

  if (sorted.length % 2 === 1) {
    return roundMoney(middle);
  }

  const lower = sorted[mid - 1] ?? ZERO;
  return roundMoney(lower.add(middle).div(2));
}

export interface IngredientCostChangeResult {
  affectedProductsCount: number;
  affectedProducts: ProductCostImpact[];
  criticalProducts: CriticalMarginProduct[];
}

export interface IngredientCostUpdateInput {
  ingredientId: string;
  previousCost: DecimalType | null;
  newCost: DecimalType;
}

const productRecalculationInclude = {
  ingredients: {
    include: {
      ingredient: { select: { id: true, currentCost: true } },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductForRecalculation = Prisma.ProductGetPayload<{
  include: typeof productRecalculationInclude;
}>;

/**
 * Recálculo masivo transaccional en lote:
 * 1. Registra PriceHistory para cada insumo modificado.
 * 2. Busca todos los productos afectados en una única consulta findMany.
 * 3. Recalcula cada receta una sola vez consolidando todos los nuevos costos del lote.
 * 4. Evalúa alertas de quiebre de margen mínimo una única vez por producto.
 */
export async function applyBatchIngredientCostChanges(
  tx: any,
  changes: IngredientCostUpdateInput[]
): Promise<IngredientCostChangeResult> {
  if (!Array.isArray(changes) || changes.length === 0) {
    return {
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    };
  }

  // 1. Deduplicar por ingredientId y registrar PriceHistory para variaciones reales
  const changesByIngredient = new Map<string, IngredientCostUpdateInput>();
  for (const change of changes) {
    changesByIngredient.set(change.ingredientId, change);
  }

  const effectiveChangesMap = new Map<string, DecimalType>();

  for (const change of changesByIngredient.values()) {
    const { ingredientId, previousCost, newCost } = change;
    let oldCost = previousCost;

    if (oldCost === null || oldCost === undefined) {
      const ingredientFinder = tx.ingredient.findUnique ?? tx.ingredient.findFirst;
      if (ingredientFinder && typeof ingredientFinder === 'function') {
        const found = await ingredientFinder.call(tx.ingredient, {
          where: { id: ingredientId },
          select: { currentCost: true },
        });
        oldCost = found?.currentCost ?? null;
      }
    }

    if (oldCost && !oldCost.equals(newCost)) {
      await tx.priceHistory.create({
        data: {
          ingredientId,
          oldCost,
          newCost,
        },
      });
    }

    effectiveChangesMap.set(ingredientId, newCost);
  }

  const ingredientIds = [...effectiveChangesMap.keys()];
  if (ingredientIds.length === 0) {
    return {
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    };
  }

  // 2. Consulta única de relaciones para obtener todos los productos afectados sin duplicados
  const affectedRelations = await tx.productIngredient.findMany({
    where: { ingredientId: { in: ingredientIds } },
    select: { productId: true },
  });

  const uniqueProductIds = [...new Set(affectedRelations.map((a: { productId: string }) => a.productId))];
  if (uniqueProductIds.length === 0) {
    return {
      affectedProductsCount: 0,
      affectedProducts: [],
      criticalProducts: [],
    };
  }

  // 3. Consulta única de las recetas de todos los productos afectados
  const products: ProductForRecalculation[] = await tx.product.findMany({
    where: { id: { in: uniqueProductIds } },
    include: productRecalculationInclude,
  });

  const affectedProducts: ProductCostImpact[] = [];
  const criticalProducts: CriticalMarginProduct[] = [];

  // 4. Recálculo único por producto consolidando todos los insumos modificados
  for (const product of products) {
    const safeMinMarginPercent = product.minMarginPercent ?? ZERO;
    const previousProductCost = product.cost ?? ZERO;
    const previousMarginPercent = product.marginPercent ?? ZERO;

    const nextCost = calculateRecipeTotal(
      product.ingredients.map((pi) => {
        const updatedCost = effectiveChangesMap.get(pi.ingredientId);
        const unitCost = updatedCost !== undefined ? updatedCost : (pi.ingredient?.currentCost ?? ZERO);
        return {
          quantity: pi.quantity,
          unitCost,
        };
      })
    );

    const nextMarginAmount = calculateMarginAmount(product.salePrice, nextCost);
    const nextMarginPercent = calculateMarginPercent(product.salePrice, nextCost);

    await tx.product.update({
      where: { id: product.id },
      data: {
        cost: nextCost,
        marginAmount: nextMarginAmount,
        marginPercent: nextMarginPercent,
      },
    });

    const productImpact: ProductCostImpact = {
      productId: product.id,
      productName: product.name ?? 'Producto',
      previousCost: previousProductCost,
      newCost: nextCost,
      currentMarginPercent: nextMarginPercent,
      minMarginPercent: safeMinMarginPercent,
    };

    affectedProducts.push(productImpact);

    const crossedMinimumMargin =
      previousMarginPercent.greaterThanOrEqualTo(safeMinMarginPercent) &&
      nextMarginPercent.lessThan(safeMinMarginPercent);

    if (crossedMinimumMargin) {
      criticalProducts.push(productImpact);
    }
  }

  return {
    affectedProductsCount: affectedProducts.length,
    affectedProducts,
    criticalProducts,
  };
}

/**
 * Mantiene compatibilidad total con llamadas unitarias delegando en el método por lote.
 */
export async function applyIngredientCostChange(
  tx: any,
  ingredientId: string,
  previousCost: DecimalType | null,
  newCost: DecimalType
): Promise<IngredientCostChangeResult> {
  return applyBatchIngredientCostChanges(tx, [
    { ingredientId, previousCost, newCost },
  ]);
}

export default {
  calculateItemCost,
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  calculateUnitCost,
  classifyProductHealthBucket,
  calculateMedianMarginPercent,
  applyIngredientCostChange,
  applyBatchIngredientCostChanges,
};
