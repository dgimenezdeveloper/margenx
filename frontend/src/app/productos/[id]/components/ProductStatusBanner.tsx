// frontend/src/app/productos/[id]/components/ProductStatusBanner.tsx
import { AlertTriangle, ShieldCheck } from 'lucide-react'

interface ProductStatusBannerProps {
  isCollaborator: boolean
  hasRecipe: boolean
  hasCriticalMargin: boolean
  isHealthy: boolean
  hasHealthyMargin: boolean
  targetMargin: number
  margin: number
}

export function ProductStatusBanner({
  isCollaborator,
  hasRecipe,
  hasCriticalMargin,
  isHealthy,
  hasHealthyMargin,
  targetMargin,
  margin,
}: ProductStatusBannerProps) {
  if (isCollaborator) return null

  if (!hasRecipe) {
    return (
      <section className="rounded-3xl border-2 border-gray-200 bg-gray-100 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado del producto</p>
        <p className="mt-1 text-2xl font-black text-gray-700 dark:text-gray-300">Borrador (Sin Receta)</p>
        <p className="mt-1 text-xs text-gray-500">Agrega materias primas para comenzar a calcular automáticamente el margen de ganancia.</p>
      </section>
    )
  }

  const isLow = hasCriticalMargin || (!isHealthy && !hasHealthyMargin)

  return (
    <section
      className={`rounded-3xl border-2 p-5 shadow-sm ${
        isLow
          ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40'
          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
            isLow
              ? 'bg-rose-200/70 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
              : 'bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
          }`}
        >
          {isLow ? <AlertTriangle className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
          {isLow ? 'Margen Bajo' : 'Margen Saludable'}
        </span>
        <span className={`text-xs font-semibold ${isLow ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
          Objetivo: {targetMargin}%
        </span>
      </div>
      <p className={`mt-2 text-5xl font-black tracking-tight ${isLow ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
        {margin.toFixed(1)}%
      </p>
      <p className={`mt-1 text-sm font-semibold ${isLow ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
        {isLow ? `Por debajo del mínimo (${targetMargin}%)` : `Cumple con el umbral personalizado (${targetMargin}%).`}
      </p>
    </section>
  )
}