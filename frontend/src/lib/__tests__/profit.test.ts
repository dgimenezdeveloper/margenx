import { describe, expect, it } from 'vitest'

import { formatIsoDay, formatProfit, profitTone } from '@/lib/profit'

describe('profit: textos de la ganancia real (#450)', () => {
  it('formatIsoDay pasa AAAA-MM-DD a DD/MM/AAAA y deja igual lo que no entiende', () => {
    expect(formatIsoDay('2026-11-24')).toBe('24/11/2026')
    expect(formatIsoDay('24/11')).toBe('24/11')
  })

  it('profitTone: pérdida, ganancia o cero', () => {
    expect(profitTone('-2500.00')).toBe('loss')
    expect(profitTone('38000.00')).toBe('gain')
    expect(profitTone('0.00')).toBe('none')
  })

  it('formatProfit rotula la pérdida con su signo y deja la ganancia y el cero como monto', () => {
    expect(formatProfit('-2500.00')).toBe('Pérdida −$2.500,00')
    expect(formatProfit('38000.00')).toBe('$38.000,00')
    expect(formatProfit('0.00')).toBe('$0,00')
  })
})
