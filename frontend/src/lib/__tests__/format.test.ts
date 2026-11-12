import { describe, expect, it } from 'vitest'
import { formatMoney, formatPercent, formatQuantity, formatQuantityWithUnit, formatUnit } from '@/lib/format'

const NBSP = ' '

describe('formatPercent', () => {
  it('muestra un margen de 36,86 como "36,9 %"', () => {
    expect(formatPercent(36.86)).toBe(`36,9${NBSP}%`)
  })

  it('antepone "+" solo si se pide y el valor es positivo', () => {
    expect(formatPercent(119, { signed: true })).toBe(`+119,0${NBSP}%`)
    expect(formatPercent(-4.25, { signed: true })).toBe(`-4,3${NBSP}%`)
  })

  it('no muestra "-0,0 %" ni falla con valores ausentes', () => {
    expect(formatPercent(-0.01)).toBe(`0,0${NBSP}%`)
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent('abc')).toBe('—')
  })

  it('acepta decimales y texto decimal de la API', () => {
    expect(formatPercent('12.5', { decimals: 0 })).toBe(`13${NBSP}%`)
  })
})

describe('formatMoney', () => {
  it('conserva los centavos del costo (7000,51 no se redondea a 7.001)', () => {
    expect(formatMoney(7000.51)).toBe('$7.000,51')
  })

  it('redondea a pesos enteros cuando se pide', () => {
    expect(formatMoney(1234.56, { decimals: 0 })).toBe('$1.235')
  })

  it('pone el signo antes del peso en negativos', () => {
    expect(formatMoney(-840)).toBe('-$840,00')
    expect(formatMoney(undefined)).toBe('—')
  })
})

describe('formatQuantity y formatUnit', () => {
  it('usa coma decimal sin ceros sobrantes', () => {
    expect(formatQuantity(0.7)).toBe('0,7')
    expect(formatQuantity(1250)).toBe('1.250')
    expect(formatQuantity(0.12345)).toBe('0,123')
    expect(formatQuantity(null)).toBe('')
  })

  it('traduce las unidades internas a nombres legibles', () => {
    expect(formatUnit('u')).toBe('unidad')
    expect(formatUnit('unit')).toBe('unidad')
    expect(formatUnit('l')).toBe('litro')
    expect(formatUnit('kg')).toBe('kg')
    expect(formatUnit('docena')).toBe('docena')
    expect(formatUnit(undefined)).toBe('')
  })

  it('combina cantidad y unidad', () => {
    expect(formatQuantityWithUnit(0.7, 'kg')).toBe('0,7 kg')
    expect(formatQuantityWithUnit(3, 'u')).toBe('3 unidad')
  })
})
