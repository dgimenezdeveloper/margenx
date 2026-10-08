import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MarginBadgeProps {
  marginPercent: number
  minMarginPercent: number
  hasRecipe: boolean
  className?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}

export function MarginBadge({
  marginPercent,
  minMarginPercent,
  hasRecipe,
  className,
  showValue = true,
  size = 'sm',
}: MarginBadgeProps) {
  const sizeClasses = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]'
  const iconSizeClasses = size === 'md' ? 'size-3.5 shrink-0' : 'size-3 shrink-0'

  if (!hasRecipe) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full font-bold transition-colors',
          'border border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
          sizeClasses,
          className
        )}
      >
        Sin Receta
      </span>
    )
  }

  const isCritical = Number(marginPercent) < Number(minMarginPercent)
  const formattedValue = Number(marginPercent).toFixed(1).replace(/\.0$/, '')
  const label = isCritical ? 'Crítico' : 'Saludable'
  const text = showValue ? `${label} (${formattedValue}%)` : label

  if (isCritical) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full font-black transition-colors',
          'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/70 dark:text-rose-200',
          sizeClasses,
          className
        )}
      >
        <AlertTriangle className={iconSizeClasses} aria-hidden="true" />
        <span>{text}</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full font-black transition-colors',
        'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/70 dark:text-emerald-200',
        sizeClasses,
        className
      )}
    >
      <ShieldCheck className={iconSizeClasses} aria-hidden="true" />
      <span>{text}</span>
    </span>
  )
}