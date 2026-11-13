export function getAvailableRecipeUnits(baseUnit: string): string[] {
  if (baseUnit === 'kg') return ['gr', 'kg']
  if (baseUnit === 'litro' || baseUnit === 'l') return ['ml', 'litro']
  return [baseUnit || 'unidad']
}

// ProductIngredient.quantity es Decimal(10,3): la base guarda hasta 3 decimales en la unidad del insumo
const roundTo3 = (value: number) => Math.round(value * 1000) / 1000

export function convertToBaseQty(qty: number, selectedUnit: string, baseUnit: string): { baseQty: number; precisionLost: boolean } {
  let result = qty
  if (baseUnit === 'kg' && selectedUnit === 'gr') result = qty / 1000
  if ((baseUnit === 'litro' || baseUnit === 'l') && selectedUnit === 'ml') result = qty / 1000

  const rounded = roundTo3(result)
  const precisionLost = Math.abs(result - rounded) > Number.EPSILON

  return { baseQty: rounded, precisionLost }
}

export function convertToRecipeUnitQty(baseQty: number, selectedUnit: string, baseUnit: string): number {
  let result = baseQty
  if (baseUnit === 'kg' && selectedUnit === 'gr') result = baseQty * 1000
  if ((baseUnit === 'litro' || baseUnit === 'l') && selectedUnit === 'ml') result = baseQty * 1000
  // Evita restos de coma flotante (1.005 * 1000 = 1004.9999999999999)
  return roundTo3(result)
}

export type RecipeQuantityCheck =
  | { status: 'invalid' }
  | { status: 'belowMinimum' }
  | { status: 'ok' | 'rounded'; inputQty: number; baseQty: number }

/**
 * Valida una cantidad escrita en la unidad de receta contra lo que la API acepta:
 * mayor a cero y con hasta 3 decimales en la unidad del insumo.
 * - `invalid`: vacía, no numérica o menor o igual a cero.
 * - `belowMinimum`: redondea a 0 en la unidad del insumo (por ejemplo, 0,4 gr = 0,0004 kg).
 * - `rounded`: se guarda redondeada; `inputQty` es el equivalente exacto de lo que se guarda.
 * - `ok`: se guarda tal cual.
 */
export function checkRecipeQuantity(value: string, recipeUnit: string, baseUnit: string): RecipeQuantityCheck {
  const qty = Number(value)
  if (value.trim() === '' || !Number.isFinite(qty) || qty <= 0) return { status: 'invalid' }

  const { baseQty, precisionLost } = convertToBaseQty(qty, recipeUnit, baseUnit)
  if (baseQty <= 0) return { status: 'belowMinimum' }
  if (!precisionLost) return { status: 'ok', inputQty: qty, baseQty }

  return { status: 'rounded', inputQty: convertToRecipeUnitQty(baseQty, recipeUnit, baseUnit), baseQty }
}
