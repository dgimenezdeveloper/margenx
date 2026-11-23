/*
  Costos de receta en el frontend con el mismo redondeo que el backend (#431).
  `calculateItemCost` (backend/src/services/marginCalculator.ts) redondea cada renglón a
  2 decimales con ROUND_HALF_UP y después suma. Si el simulador sumara sin redondear,
  podría quedar un centavo abajo de la lista ($2.086,54 contra $2.086,55).

  La cuenta se hace con enteros exactos (BigInt) para no arrastrar errores de coma
  flotante: en JavaScript, 1,005 × 100 da 100,4999…
*/

/** Decimales con que se pasan los factores a enteros: alcanza para cantidades de 3 y costos de 2. */
const SCALE_DIGITS = 6
const SCALE = 10 ** SCALE_DIGITS
/** El producto queda con 12 decimales; para llegar a centavos se divide por 10^10. */
const TO_CENTS = 10n ** BigInt(SCALE_DIGITS * 2 - 2)
const HALF = TO_CENTS / 2n

/** Costo de un renglón en centavos: cantidad × costo unitario, redondeado con ROUND_HALF_UP. */
export function itemCostCents(quantity: number, unitCost: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost) || quantity <= 0 || unitCost <= 0) return 0
  const product = BigInt(Math.round(quantity * SCALE)) * BigInt(Math.round(unitCost * SCALE))
  return Number((product + HALF) / TO_CENTS)
}

/** Costo total de la receta: la suma de los renglones ya redondeados, como la lista del backend. */
export function recipeTotalCost(items: ReadonlyArray<{ quantity: number; unitCost: number }>): number {
  const cents = items.reduce((sum, item) => sum + itemCostCents(item.quantity, item.unitCost), 0)
  return cents / 100
}
