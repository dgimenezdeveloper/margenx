export function getAvailableRecipeUnits(baseUnit: string): string[] {
  if (baseUnit === 'kg') return ['gr', 'kg']
  if (baseUnit === 'litro' || baseUnit === 'l') return ['ml', 'litro']
  return [baseUnit || 'unidad']
}

export function convertToBaseQty(qty: number, selectedUnit: string, baseUnit: string): { baseQty: number; precisionLost: boolean } {
  let result = qty
  if (baseUnit === 'kg' && selectedUnit === 'gr') result = qty / 1000
  if ((baseUnit === 'litro' || baseUnit === 'l') && selectedUnit === 'ml') result = qty / 1000

  // La base de datos guarda hasta 3 decimales (Decimal(10,3))
  const rounded = Math.round(result * 1000) / 1000
  const precisionLost = Math.abs(result - rounded) > Number.EPSILON

  return { baseQty: rounded, precisionLost }
}

export function convertToRecipeUnitQty(baseQty: number, selectedUnit: string, baseUnit: string): number {
  if (baseUnit === 'kg' && selectedUnit === 'gr') return baseQty * 1000
  if ((baseUnit === 'litro' || baseUnit === 'l') && selectedUnit === 'ml') return baseQty * 1000
  return baseQty
}
