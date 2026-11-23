import { DIFFERENCE_LABELS, differenceTone, formatDifference, type DifferenceTone } from '@/lib/cash-shift'
import { cn } from '@/lib/utils'

const TONE_CLASSES: Record<DifferenceTone, string> = {
  short: 'text-rose-700 dark:text-rose-300 print:text-black',
  over: 'text-amber-700 dark:text-amber-300 print:text-black',
  even: 'text-emerald-700 dark:text-emerald-300 print:text-black',
}

/**
 * Diferencia del arqueo: "Falta −$500,00", "Sobra +$10,50" o "Justo $0,00". El rótulo
 * acompaña al color, para que se entienda sin distinguir colores y en la impresión.
 */
export function CashShiftDifference({
  cents,
  className,
  testId,
}: {
  cents: number
  className?: string
  testId?: string
}) {
  const tone = differenceTone(cents)
  return (
    <span data-testid={testId} className={cn('font-black', TONE_CLASSES[tone], className)}>
      {DIFFERENCE_LABELS[tone]} {formatDifference(cents)}
    </span>
  )
}
