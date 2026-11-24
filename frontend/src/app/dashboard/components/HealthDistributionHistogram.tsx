import { useMemo } from 'react'
import { BarChart3, FilterX } from 'lucide-react'
import type { DashboardMetrics } from '@/services/dashboardService'
import { formatPercent } from '@/lib/format'
import {
  HEALTH_BUCKET_META,
  SURPLUS_MARGIN_THRESHOLD,
  type ActiveHealthBucket,
} from '@/lib/healthBucket'

interface HealthBucketColumn {
  key: ActiveHealthBucket
  title: string
  rangeLabel: string
  count: number
  percentage: number
  colorClass: string
  bgHoverClass: string
  borderClass: string
  textClass: string
}

interface HealthDistributionHistogramProps {
  /** Métricas de `GET /api/dashboard/metrics`: los buckets se cuentan en el servidor sobre todo el catálogo. */
  metrics: DashboardMetrics | null
  isLoading: boolean
  selectedBucket: ActiveHealthBucket | null
  onSelectBucket: (key: ActiveHealthBucket | null) => void
}

const surplusLabel = formatPercent(SURPLUS_MARGIN_THRESHOLD, { decimals: 0 })

/**
 * Histograma interactivo de la salud financiera de todo el catálogo.
 * No cuenta productos en el cliente: dibuja los buckets que calcula el servidor,
 * así las columnas coinciden con las tarjetas y con el total del catálogo.
 */
export function HealthDistributionHistogram({
  metrics,
  isLoading,
  selectedBucket,
  onSelectBucket,
}: HealthDistributionHistogramProps) {
  const healthBuckets = useMemo<HealthBucketColumn[]>(() => {
    if (!metrics) return []
    const { lossCount, riskCount, targetCount, surplusCount } = metrics
    const total = lossCount + riskCount + targetCount + surplusCount
    const calcPct = (cnt: number) => (total > 0 ? (cnt / total) * 100 : 0)

    return [
      {
        key: 'loss',
        title: HEALTH_BUCKET_META.loss.label,
        rangeLabel: `< ${formatPercent(0, { decimals: 0 })}`,
        count: lossCount,
        percentage: calcPct(lossCount),
        colorClass: HEALTH_BUCKET_META.loss.chartBarClassName,
        bgHoverClass: HEALTH_BUCKET_META.loss.bgHoverClassName,
        borderClass: HEALTH_BUCKET_META.loss.borderClassName,
        textClass: HEALTH_BUCKET_META.loss.textClassName,
      },
      {
        key: 'risk',
        title: HEALTH_BUCKET_META.risk.label,
        rangeLabel: 'Bajo su mínimo',
        count: riskCount,
        percentage: calcPct(riskCount),
        colorClass: HEALTH_BUCKET_META.risk.chartBarClassName,
        bgHoverClass: HEALTH_BUCKET_META.risk.bgHoverClassName,
        borderClass: HEALTH_BUCKET_META.risk.borderClassName,
        textClass: HEALTH_BUCKET_META.risk.textClassName,
      },
      {
        key: 'target',
        title: HEALTH_BUCKET_META.target.label,
        rangeLabel: `Su mínimo a ${surplusLabel}`,
        count: targetCount,
        percentage: calcPct(targetCount),
        colorClass: HEALTH_BUCKET_META.target.chartBarClassName,
        bgHoverClass: HEALTH_BUCKET_META.target.bgHoverClassName,
        borderClass: HEALTH_BUCKET_META.target.borderClassName,
        textClass: HEALTH_BUCKET_META.target.textClassName,
      },
      {
        key: 'surplus',
        title: HEALTH_BUCKET_META.surplus.label,
        rangeLabel: `> ${surplusLabel}`,
        count: surplusCount,
        percentage: calcPct(surplusCount),
        colorClass: HEALTH_BUCKET_META.surplus.chartBarClassName,
        bgHoverClass: HEALTH_BUCKET_META.surplus.bgHoverClassName,
        borderClass: HEALTH_BUCKET_META.surplus.borderClassName,
        textClass: HEALTH_BUCKET_META.surplus.textClassName,
      },
    ]
  }, [metrics])

  const activeProductsCount = healthBuckets.reduce((sum, bucket) => sum + bucket.count, 0)
  const draftProductsCount = metrics?.draftCount ?? 0
  const catalogTotal = activeProductsCount + draftProductsCount
  const maxBucketCount = useMemo(() => Math.max(1, ...healthBuckets.map((b) => b.count)), [healthBuckets])
  const activeBucketMeta = useMemo(() => healthBuckets.find((b) => b.key === selectedBucket), [healthBuckets, selectedBucket])

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="h-6 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800 mb-6" />
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </section>
    )
  }

  // Sin métricas (falla de la API) no se dibujan columnas en cero: el panel muestra el error.
  if (!metrics) {
    return null
  }

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white md:text-lg">
              Distribución de Salud Financiera
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Volumen del catálogo agrupado por rango de rentabilidad frente al costo.
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Cada producto se compara con su propio margen mínimo.
          </p>
        </div>

        {selectedBucket && activeBucketMeta && (
          <button
            type="button"
            onClick={() => onSelectBucket(null)}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-300 dark:hover:bg-indigo-800"
          >
            <FilterX className="size-3.5" />
            Filtrando: {activeBucketMeta.title} ({activeBucketMeta.count})
            <span className="text-[10px] underline ml-1">Restablecer</span>
          </button>
        )}
      </div>

      {activeProductsCount === 0 ? (
        <div className="mt-4 flex h-36 items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Aún no hay productos con receta activa para clasificar en el histograma.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {healthBuckets.map((bucket) => {
              const isSelected = selectedBucket === bucket.key
              const hasProducts = bucket.count > 0
              const heightPercent = hasProducts ? Math.max(18, (bucket.count / maxBucketCount) * 100) : 0

              return (
                <button
                  key={bucket.key}
                  type="button"
                  onClick={() => onSelectBucket(isSelected ? null : bucket.key)}
                  disabled={!hasProducts}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col justify-end rounded-2xl border px-1.5 py-2 transition-all text-center cursor-pointer select-none sm:p-3.5 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40'
                      : `${bucket.borderClass} ${hasProducts ? bucket.bgHoverClass : 'opacity-40 cursor-not-allowed'} bg-gray-50/50 dark:bg-gray-800/20`
                  }`}
                >
                  {/*
                    Sin aria-label: el nombre sale del texto visible (WCAG 2.5.3, #442) y el lector dice
                    "En riesgo: 107 productos, 37 % del catálogo, Bajo su mínimo". El orden del código
                    es el de lectura; `order-*` mantiene el visual: cantidad, barra, estado y rango.
                  */}
                  {/* El mismo nombre en todos los anchos: a 360 px "En objetivo" pasa a dos líneas. */}
                  <p className="order-3 mt-2 text-[10px] font-black leading-tight text-gray-900 dark:text-gray-100 sm:text-xs">
                    <span>{bucket.title}</span>
                    <span className="sr-only">:</span>
                  </p>

                  <div className="order-1 mb-1.5">
                    <span data-testid="bucket-count" className={`block text-base font-black sm:text-xl ${bucket.textClass}`}>
                      {bucket.count}
                    </span>
                    <span className="sr-only"> {bucket.count === 1 ? 'producto' : 'productos'}, </span>
                    <span className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 sm:text-xs">
                      {formatPercent(bucket.percentage, { decimals: 0 })}
                    </span>
                    <span className="sr-only"> del catálogo, </span>
                  </div>

                  <div aria-hidden="true" className="order-2 flex h-24 w-full items-end justify-center rounded-lg bg-gray-200/50 p-1 dark:bg-gray-800/60 sm:h-28">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-md transition-all duration-300 ${bucket.colorClass} ${
                        isSelected ? 'brightness-110 shadow-sm' : 'group-hover:opacity-90'
                      }`}
                    />
                  </div>

                  <p className="order-4 mt-0.5 text-[9px] font-bold text-gray-500 dark:text-gray-400 sm:text-[10px]">
                    {bucket.rangeLabel}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-[11px] text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
            <span>
              {draftProductsCount > 0 ? (
                <>
                  <strong className="text-gray-600 dark:text-gray-300">{draftProductsCount}</strong> en{' '}
                  {HEALTH_BUCKET_META.draft.label.toLowerCase()} (sin receta)
                </>
              ) : (
                `${formatPercent(100, { decimals: 0 })} del catálogo costea con receta`
              )}
              {' · '}
              {catalogTotal} {catalogTotal === 1 ? 'producto' : 'productos'} en total
            </span>
            <span className="hidden sm:inline">
              Hacé clic en una columna para filtrar los productos de abajo
            </span>
          </div>
        </div>
      )}
    </section>
  )
}