import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { formatPercent } from '@/lib/format'
import {
  HEALTH_BUCKET_META,
  resolveProductHealthBucket,
} from '@/lib/healthBucket'

interface ProductStatusBannerProps {
  isCollaborator: boolean
  hasRecipe: boolean
  hasCriticalMargin?: boolean
  isHealthy?: boolean
  hasHealthyMargin?: boolean
  targetMargin: number
  margin: number
}

export function ProductStatusBanner({
  isCollaborator,
  hasRecipe,
  targetMargin,
  margin,
}: ProductStatusBannerProps) {
  if (isCollaborator) return null

  const bucket = resolveProductHealthBucket({
    hasRecipe,
    marginPercent: margin,
    minMarginPercent: targetMargin,
  })

  const meta = HEALTH_BUCKET_META[bucket]

  if (bucket === 'draft') {
    return (
      <section className="rounded-3xl border-2 border-gray-200 bg-gray-100 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Estado del producto
        </p>
        <p className="mt-1 text-2xl font-black text-gray-700 dark:text-gray-300">
          {meta.label}
        </p>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Agregá materias primas para empezar a calcular automáticamente el margen de ganancia.
        </p>
      </section>
    )
  }

  const isAlert = bucket === 'loss' || bucket === 'risk'

  return (
    <section
      className={`rounded-3xl border-2 p-5 shadow-sm ${
        isAlert
          ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40'
          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
            isAlert
              ? 'bg-rose-200/70 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
              : 'bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
          }`}
        >
          {isAlert ? <AlertTriangle className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
          {meta.label}
        </span>
        <span
          className={`text-xs font-semibold ${
            isAlert
              ? 'text-rose-700 dark:text-rose-400'
              : 'text-emerald-700 dark:text-emerald-400'
          }`}
        >
          Objetivo: {formatPercent(targetMargin, { minDecimals: 0 })}
        </span>
      </div>
      <p
        className={`mt-2 text-5xl font-black tracking-tight ${
          isAlert
            ? 'text-rose-700 dark:text-rose-300'
            : 'text-emerald-700 dark:text-emerald-300'
        }`}
      >
        {formatPercent(margin)}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${
          isAlert
            ? 'text-rose-700 dark:text-rose-400'
            : 'text-emerald-700 dark:text-emerald-400'
        }`}
      >
        {bucket === 'loss'
          ? 'Venta a pérdida: el precio de venta no cubre los costos de los insumos.'
          : bucket === 'risk'
            ? `Por debajo del mínimo (${formatPercent(targetMargin, { minDecimals: 0 })}).`
            : bucket === 'target'
              ? `Cumple con el umbral personalizado (${formatPercent(targetMargin, { minDecimals: 0 })}).`
              : `Supera el umbral mínimo (${formatPercent(targetMargin, { minDecimals: 0 })}) y el 60 % de rentabilidad.`}
      </p>
    </section>
  )
}