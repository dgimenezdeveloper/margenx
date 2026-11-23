import { formatMoney } from '@/lib/format'

/** "AAAA-MM-DD" → "24/11/2026". */
export function formatIsoDay(iso: string): string {
  const [year, month, day] = iso.split('-')
  return year && month && day ? `${day}/${month}/${year}` : iso
}

export type ProfitTone = 'loss' | 'gain' | 'none'

export function profitTone(profit: string): ProfitTone {
  const value = Number(profit)
  if (value < 0) return 'loss'
  if (value > 0) return 'gain'
  return 'none'
}

/** "$38.000,00", o "Pérdida −$2.500,00": el rótulo acompaña al color. */
export function formatProfit(profit: string): string {
  const value = Number(profit)
  return value < 0 ? `Pérdida −${formatMoney(Math.abs(value))}` : formatMoney(value)
}
