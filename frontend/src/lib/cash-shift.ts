import { formatMoney } from '@/lib/format'

/** Tope de un monto de caja en centavos: $99.999.999,99, igual que la API. */
const MAX_CENTS = 9_999_999_999

/**
 * Monto escrito por el comerciante, en centavos, o `null` si no es válido.
 * Acepta "34500", "34.500", "$ 1.234,50" y, del teclado numérico del celular, "2500.5":
 * un punto es separador de miles solo si separa grupos de tres cifras.
 */
export function parseMoneyInput(raw: string): number | null {
  let text = raw.replace(/\$/g, '').replace(/\s/g, '')
  if (!text) return null
  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const [integer = '0', decimals = ''] = text.split('.')
  const cents = Number(integer) * 100 + Number(decimals.padEnd(2, '0'))
  return cents > MAX_CENTS ? null : cents
}

/** Importe de la API ("35000.00") en centavos. */
export function moneyToCents(value: string): number {
  return Math.round(Number(value) * 100)
}

export type DifferenceTone = 'short' | 'over' | 'even'

/** Negativa: falta plata. Positiva: sobra. */
export function differenceTone(cents: number): DifferenceTone {
  if (cents < 0) return 'short'
  if (cents > 0) return 'over'
  return 'even'
}

/** "−$500,00", "+$10,50" o "$0,00". */
export function formatDifference(cents: number): string {
  const amount = formatMoney(Math.abs(cents) / 100)
  if (cents < 0) return `−${amount}`
  if (cents > 0) return `+${amount}`
  return amount
}

export const DIFFERENCE_LABELS: Record<DifferenceTone, string> = {
  short: 'Falta',
  over: 'Sobra',
  even: 'Justo',
}
