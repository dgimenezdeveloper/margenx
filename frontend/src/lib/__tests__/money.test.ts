import { describe, expect, it } from 'vitest'

import { itemCostCents, recipeTotalCost } from '@/lib/money'

describe('itemCostCents: costo de un renglón como calculateItemCost del backend (ROUND_HALF_UP a 2 decimales)', () => {
  it('redondea medio centavo hacia arriba', () => {
    // 0,723 l de leche a $1.715 = $1.239,945 → $1.239,95
    expect(itemCostCents(0.723, 1715)).toBe(123995)
    // 0,05 kg de harina a $736,25 = $36,8125 → $36,81
    expect(itemCostCents(0.05, 736.25)).toBe(3681)
  })

  it('no arrastra errores de coma flotante (1,005 × 100 da 100,4999… en JavaScript)', () => {
    expect(itemCostCents(1.005, 100)).toBe(10050)
    expect(itemCostCents(0.1, 0.3)).toBe(3)
  })

  it('una cantidad o un costo en cero, negativos o inválidos no suman, como en el backend', () => {
    expect(itemCostCents(0, 736.25)).toBe(0)
    expect(itemCostCents(0.2, 0)).toBe(0)
    expect(itemCostCents(-1, 736.25)).toBe(0)
    expect(itemCostCents(Number.NaN, 736.25)).toBe(0)
  })
})

describe('recipeTotalCost', () => {
  it('Escenario "Mismo costo que la lista" (RC-12): suma los renglones ya redondeados, $2.086,55 y no $2.086,54', () => {
    const receta = [
      { quantity: 0.779, unitCost: 868.77 }, // Harina de trigo 0000 Olavarriense: 676,77183 → 676,77
      { quantity: 0.964, unitCost: 176.17 }, // Huevo grande: 169,82788 → 169,83
      { quantity: 0.723, unitCost: 1715 }, // Leche entera larga vida Silvia: 1.239,945 → 1.239,95
    ]
    expect(recipeTotalCost(receta)).toBe(2086.55)
  })

  it('una receta vacía cuesta 0', () => {
    expect(recipeTotalCost([])).toBe(0)
  })
})
