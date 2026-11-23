import { describe, expect, it } from 'vitest'

import { differenceTone, formatDifference, moneyToCents, parseMoneyInput } from '@/lib/cash-shift'

describe('parseMoneyInput: montos como los escribe un comerciante argentino', () => {
  it('acepta enteros, punto de miles y coma decimal', () => {
    expect(parseMoneyInput('34500')).toBe(3450000)
    expect(parseMoneyInput('34.500')).toBe(3450000)
    expect(parseMoneyInput('$ 1.234.567,89')).toBe(123456789)
    expect(parseMoneyInput('2500,5')).toBe(250050)
    expect(parseMoneyInput('0')).toBe(0)
  })

  it('un punto que no separa miles es decimal (teclado numérico del celular)', () => {
    expect(parseMoneyInput('2500.5')).toBe(250050)
    expect(parseMoneyInput('1500.25')).toBe(150025)
  })

  it('devuelve null si está vacío, es negativo, tiene más de 2 decimales o supera el máximo', () => {
    expect(parseMoneyInput('')).toBeNull()
    expect(parseMoneyInput('  ')).toBeNull()
    expect(parseMoneyInput('-500')).toBeNull()
    expect(parseMoneyInput('10,555')).toBeNull()
    expect(parseMoneyInput('mil')).toBeNull()
    expect(parseMoneyInput('100.000.000')).toBeNull()
  })
})

describe('diferencia del arqueo', () => {
  it('pasa los importes de la API a centavos sin errores de coma flotante', () => {
    expect(moneyToCents('35000.00')).toBe(3500000)
    expect(moneyToCents('0.10')).toBe(10)
    expect(moneyToCents('1500.29')).toBe(150029)
  })

  it('negativa es faltante, positiva es sobrante y cero, justo', () => {
    expect(differenceTone(-50000)).toBe('short')
    expect(differenceTone(1000)).toBe('over')
    expect(differenceTone(0)).toBe('even')
  })

  it('muestra el signo con el menos tipográfico y el más en los sobrantes', () => {
    expect(formatDifference(-50000)).toBe('−$500,00')
    expect(formatDifference(1050)).toBe('+$10,50')
    expect(formatDifference(0)).toBe('$0,00')
  })
})
