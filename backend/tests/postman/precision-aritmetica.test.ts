import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import {
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
} from '../../src/services/marginCalculator'

const D = (v: string | number) => new Prisma.Decimal(v)

/** Tolerancia máxima admitida por la issue #77 para valores monetarios. */
const TOLERANCE_MONEY = 0.01

/**
 * Reimplementación fiel de la matemática que corre HOY en el frontend
 * (número flotante nativo de JS, sin Prisma.Decimal), para detectar
 * discrepancias de redondeo entre lo que ve el comerciante en pantalla
 * y lo que liquida el backend.
 *
 * Fuente (mismo patrón en ambos archivos):
 * - frontend/src/app/productos/detalle/page.tsx
 * - frontend/src/stores/useRecipeStore.ts
 */
const frontendMath = {
  recipeTotal(items: Array<{ quantity: number; unitCost: number }>): number {
    // El frontend suma en punto flotante puro, sin redondear cada ítem
    // (a diferencia del backend, que redondea cada ítem antes de sumar).
    return items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0)
  },
  marginAmount(salePrice: number, totalCost: number, hasItems: boolean): number {
    if (!hasItems || salePrice <= 0) return 0
    return salePrice - totalCost
  },
  marginPercent(salePrice: number, totalCost: number, hasItems: boolean): number {
    if (!hasItems || salePrice <= 0) return 0
    const raw = ((salePrice - totalCost) / salePrice) * 100
    // El frontend redondea el % a 1 decimal (Math.round(x*10)/10).
    // El backend (marginCalculator.ts) redondea a 2 decimales.
    return Math.round(raw * 10) / 10
  },
}

interface ComparisonRow {
  caso: string
  campo: string
  backend: string
  frontend: string
  diferencia: string
  dentroDeTolerancia: boolean
}

const rows: ComparisonRow[] = []

function compareMoney(caso: string, campo: string, backendValue: Prisma.Decimal, frontendValue: number) {
  const backendNum = Number(backendValue.toFixed(2))
  const diff = Math.abs(backendNum - frontendValue)
  const dentro = diff <= TOLERANCE_MONEY
  rows.push({
    caso,
    campo,
    backend: backendNum.toFixed(2),
    frontend: frontendValue.toFixed(2),
    diferencia: diff.toFixed(4),
    dentroDeTolerancia: dentro,
  })
  return { backendNum, diff, dentro }
}

function comparePercent(caso: string, backendValue: Prisma.Decimal, frontendValue: number) {
  const backendNum = Number(backendValue.toFixed(2))
  const diff = Math.abs(backendNum - frontendValue)
  // El frontend solo tiene 1 decimal de resolución: la tolerancia real
  // no puede ser menor a su propio paso de redondeo (0.05 en el peor caso).
  // +1e-9 de margen para ruido de punto flotante en el límite exacto (ej. 0.05000000000004).
  const dentro = diff <= 0.05 + 1e-9
  rows.push({
    caso,
    campo: 'marginPercent (%)',
    backend: backendNum.toFixed(2),
    frontend: frontendValue.toFixed(1),
    diferencia: diff.toFixed(4),
    dentroDeTolerancia: dentro,
  })
  return { backendNum, diff, dentro }
}

describe('Precisión aritmética: frontend (float) vs backend (Prisma.Decimal) — issue #77', () => {
  it('TC-PREC-01: insumo fraccionario mínimo (azafrán 0.005 kg a $85.000/kg)', () => {
    const items = [{ quantity: 0.005, unitCost: 85000 }]
    const salePrice = 1500

    const backendCost = calculateRecipeTotal(items.map((it) => ({ quantity: D(it.quantity), unitCost: D(it.unitCost) })))
    const backendMarginAmount = calculateMarginAmount(D(salePrice), backendCost)
    const backendMarginPercent = calculateMarginPercent(D(salePrice), backendCost)

    const frontendCost = frontendMath.recipeTotal(items)
    const frontendMarginAmount = frontendMath.marginAmount(salePrice, frontendCost, true)
    const frontendMarginPercent = frontendMath.marginPercent(salePrice, frontendCost, true)

    const { dentro: costOk } = compareMoney('TC-PREC-01', 'totalCost', backendCost, frontendCost)
    const { dentro: amountOk } = compareMoney('TC-PREC-01', 'marginAmount', backendMarginAmount, frontendMarginAmount)
    const { dentro: percentOk } = comparePercent('TC-PREC-01', backendMarginPercent, frontendMarginPercent)

    expect(costOk).toBe(true)
    expect(amountOk).toBe(true)
    expect(percentOk).toBe(true)
  })

  it('TC-PREC-02: receta extensa (16 insumos con cantidades fraccionarias)', () => {
    const items = Array.from({ length: 16 }, (_, i) => ({
      quantity: Number(((i + 1) * 0.0137).toFixed(6)),
      unitCost: Number((100 + (i + 1) * 37.13).toFixed(2)),
    }))
    const salePrice = 5000

    const backendCost = calculateRecipeTotal(items.map((it) => ({ quantity: D(it.quantity), unitCost: D(it.unitCost) })))
    const backendMarginAmount = calculateMarginAmount(D(salePrice), backendCost)
    const backendMarginPercent = calculateMarginPercent(D(salePrice), backendCost)

    const frontendCost = frontendMath.recipeTotal(items)
    const frontendMarginAmount = frontendMath.marginAmount(salePrice, frontendCost, true)
    const frontendMarginPercent = frontendMath.marginPercent(salePrice, frontendCost, true)

    const { dentro: costOk } = compareMoney('TC-PREC-02', 'totalCost', backendCost, frontendCost)
    const { dentro: amountOk } = compareMoney('TC-PREC-02', 'marginAmount', backendMarginAmount, frontendMarginAmount)
    const { dentro: percentOk } = comparePercent('TC-PREC-02', backendMarginPercent, frontendMarginPercent)

    expect(costOk).toBe(true)
    expect(amountOk).toBe(true)
    expect(percentOk).toBe(true)
  })

  it('TC-PREC-03: precio con decimal no exacto ($10.000 dividido entre 3 unidades)', () => {
    const unitCost = 10000 / 3 // 3333.333...
    const items = [{ quantity: 1, unitCost }]
    const salePrice = 5000

    const backendCost = calculateRecipeTotal(items.map((it) => ({ quantity: D(it.quantity), unitCost: D(it.unitCost.toString()) })))
    const backendMarginAmount = calculateMarginAmount(D(salePrice), backendCost)
    const backendMarginPercent = calculateMarginPercent(D(salePrice), backendCost)

    const frontendCost = frontendMath.recipeTotal(items)
    const frontendMarginAmount = frontendMath.marginAmount(salePrice, frontendCost, true)
    const frontendMarginPercent = frontendMath.marginPercent(salePrice, frontendCost, true)

    const { dentro: costOk } = compareMoney('TC-PREC-03', 'totalCost', backendCost, frontendCost)
    const { dentro: amountOk } = compareMoney('TC-PREC-03', 'marginAmount', backendMarginAmount, frontendMarginAmount)
    const { dentro: percentOk } = comparePercent('TC-PREC-03', backendMarginPercent, frontendMarginPercent)

    expect(costOk).toBe(true)
    expect(amountOk).toBe(true)
    expect(percentOk).toBe(true)
  })

  it('TC-PREC-04: margen negativo (costo de receta muy superior al precio de venta)', () => {
    const items = [
      { quantity: 2.5, unitCost: 12000 },
      { quantity: 1.333, unitCost: 8500 },
    ]
    const salePrice = 1000

    const backendCost = calculateRecipeTotal(items.map((it) => ({ quantity: D(it.quantity), unitCost: D(it.unitCost) })))
    const backendMarginAmount = calculateMarginAmount(D(salePrice), backendCost)
    const backendMarginPercent = calculateMarginPercent(D(salePrice), backendCost)

    const frontendCost = frontendMath.recipeTotal(items)
    const frontendMarginAmount = frontendMath.marginAmount(salePrice, frontendCost, true)
    const frontendMarginPercent = frontendMath.marginPercent(salePrice, frontendCost, true)

    const { dentro: costOk } = compareMoney('TC-PREC-04', 'totalCost', backendCost, frontendCost)
    const { dentro: amountOk } = compareMoney('TC-PREC-04', 'marginAmount', backendMarginAmount, frontendMarginAmount)
    const { dentro: percentOk } = comparePercent('TC-PREC-04', backendMarginPercent, frontendMarginPercent)

    expect(backendMarginAmount.lessThan(0)).toBe(true)
    expect(frontendMarginAmount).toBeLessThan(0)
    expect(costOk).toBe(true)
    expect(amountOk).toBe(true)
    expect(percentOk).toBe(true)
  })

  it('imprime la matriz de comparación completa (para docs/qa/reporte-precision-sprint2.md)', () => {
    // eslint-disable-next-line no-console
    console.table(rows)
    expect(rows.length).toBeGreaterThan(0)
  })
})