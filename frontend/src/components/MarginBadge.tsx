import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPercent } from '@/lib/format'
import {
  HEALTH_BUCKET_META,
  resolveProductHealthBucket,
} from '@/lib/healthBucket'

export interface MarginBadgeProps {
  marginPercent?: number | null
  minMarginPercent?: number | null
  hasRecipe?: boolean
  ingredientsCount?: number
  ingredients?: unknown[]
  isCollaborator?: boolean
  className?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}

export function MarginBadge({
  marginPercent,
  minMarginPercent,
  hasRecipe,
  ingredientsCount,
  ingredients,
  isCollaborator = false,
  className,
  showValue = true,
  size = 'sm',
}: MarginBadgeProps) {
  // 1. Blindaje RBAC: si el usuario es colaborador, no renderiza margen en el DOM (ADR-007)
  if (isCollaborator) {
    return null
  }

  const bucket = resolveProductHealthBucket({
    hasRecipe,
    ingredientsCount,
    ingredients,
    marginPercent,
    minMarginPercent,
  })

  // 2. Guarda defensiva contra datos financieros sanitizados o ausentes
  if (bucket !== 'draft' && (marginPercent == null || minMarginPercent == null)) {
    return null
  }

  const meta = HEALTH_BUCKET_META[bucket]
  const sizeClasses = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]'
  const iconSizeClasses = size === 'md' ? 'size-3.5 shrink-0' : 'size-3 shrink-0'

  if (bucket === 'draft') {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full font-bold transition-colors',
          meta.badgeClassName,
          sizeClasses,
          className
        )}
      >
        {meta.label}
      </span>
    )
  }

  const formattedValue = formatPercent(marginPercent, { minDecimals: 0 })
  const isLossOrRisk = bucket === 'loss' || bucket === 'risk'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full font-black transition-colors',
        meta.badgeClassName,
        sizeClasses,
        className
      )}
      aria-label={`${meta.label}: ${formattedValue}`}
    >
      {isLossOrRisk ? (
        <AlertTriangle className={iconSizeClasses} aria-hidden="true" />
      ) : (
        <ShieldCheck className={iconSizeClasses} aria-hidden="true" />
      )}
      <span>
        <span>{meta.label}</span>
        {showValue && (
          <>
            {' ('}
            <span>{formattedValue}</span>
            {')'}
          </>
        )}
      </span>
    </span>
  )
}