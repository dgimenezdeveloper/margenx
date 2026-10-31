import { useMemo } from 'react'
import { BarChart3, FilterX } from 'lucide-react'
import type { Product } from '@/services/productService'

export type HealthBucketKey = 'loss' | 'low' | 'healthy' | 'high'

interface HealthBucket {
  key: HealthBucketKey
  title: string
  shortTitle: string
  rangeLabel: string
  count: number
  percentage: number
  colorClass: string
  bgHoverClass: string
  borderClass: string
  textClass: string
}

interface HealthDistributionHistogramProps {
  products: Product[]
  isLoading: boolean
  selectedBucket: HealthBucketKey | null
  onSelectBucket: (key: HealthBucketKey | null) => void
}

/**
 * Histograma interactivo que agrupa los productos según su salud financiera.
 * Calcula internamente los buckets y maneja su propio skeleton de carga.
 */
export function HealthDistributionHistogram({
  products,
  isLoading,
  selectedBucket,
  onSelectBucket,
}: HealthDistributionHistogramProps) {
  const activeRecipeProducts = useMemo(() => products.filter((p) => p.ingredients.length > 0), [products])
  const draftProductsCount = useMemo(() => products.filter((p) => p.ingredients.length === 0).length, [products])

  const healthBuckets = useMemo<HealthBucket[]>(() => {
    const total = activeRecipeProducts.length
    let lossCount = 0, lowCount = 0, healthyCount = 0, highCount = 0

    activeRecipeProducts.forEach((p) => {
      const margin = p.marginPercent ?? 0
      const target = p.minMarginPercent ?? 30

      if (margin < 0) lossCount += 1
      else if (margin < target) lowCount += 1
      else if (margin <= 60) healthyCount += 1
      else highCount += 1
    })

    const calcPct = (cnt: number) => (total > 0 ? (cnt / total) * 100 : 0)

    return [
      {
        key: 'loss',
        title: 'Venta a Pérdida',
        shortTitle: 'Pérdida',
        rangeLabel: '< 0%',
        count: lossCount,
        percentage: calcPct(lossCount),
        colorClass: 'bg-rose-600 dark:bg-rose-600',
        bgHoverClass: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
        borderClass: 'border-rose-200 dark:border-rose-900/60',
        textClass: 'text-rose-700 dark:text-rose-300',
      },
      {
        key: 'low',
        title: 'En Riesgo',
        shortTitle: 'Riesgo',
        rangeLabel: '< Umbral',
        count: lowCount,
        percentage: calcPct(lowCount),
        colorClass: 'bg-rose-400 dark:bg-rose-400',
        bgHoverClass: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
        borderClass: 'border-rose-200 dark:border-rose-900/60',
        textClass: 'text-rose-600 dark:text-rose-400',
      },
      {
        key: 'healthy',
        title: 'En Objetivo',
        shortTitle: 'Objetivo',
        rangeLabel: '30%–60%',
        count: healthyCount,
        percentage: calcPct(healthyCount),
        colorClass: 'bg-emerald-500 dark:bg-emerald-500',
        bgHoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
        borderClass: 'border-emerald-200 dark:border-emerald-900/60',
        textClass: 'text-emerald-700 dark:text-emerald-300',
      },
      {
        key: 'high',
        title: 'Superávit',
        shortTitle: 'Óptimo',
        rangeLabel: '> 60%',
        count: highCount,
        percentage: calcPct(highCount),
        colorClass: 'bg-emerald-600 dark:bg-emerald-400',
        bgHoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
        borderClass: 'border-emerald-200 dark:border-emerald-900/60',
        textClass: 'text-emerald-800 dark:text-emerald-200',
      },
    ]
  }, [activeRecipeProducts])

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
        </div>

        {selectedBucket && activeBucketMeta && (
          <button
            type="button"
            onClick={() => onSelectBucket(null)}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-300 dark:hover:bg-indigo-800"
          >
            <FilterX className="size-3.5" />
            Filtrando: {activeBucketMeta.shortTitle} ({activeBucketMeta.count})
            <span className="text-[10px] underline ml-1">Restablecer</span>
          </button>
        )}
      </div>

      {activeRecipeProducts.length === 0 ? (
        <div className="mt-4 flex h-36 items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400 dark:border-gray-800">
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
                  className={`group relative flex flex-col justify-end rounded-2xl border p-2 transition-all text-center cursor-pointer select-none sm:p-3.5 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40'
                      : `${bucket.borderClass} ${hasProducts ? bucket.bgHoverClass : 'opacity-40 cursor-not-allowed'} bg-gray-50/50 dark:bg-gray-800/20`
                  }`}
                >
                  <div className="mb-1.5">
                    <span className={`block text-base font-black sm:text-xl ${bucket.textClass}`}>
                      {bucket.count}
                    </span>
                    <span className="block text-[10px] font-semibold text-gray-400 sm:text-xs">
                      {bucket.percentage.toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex h-24 w-full items-end justify-center rounded-lg bg-gray-200/50 p-1 dark:bg-gray-800/60 sm:h-28">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-md transition-all duration-300 ${bucket.colorClass} ${
                        isSelected ? 'brightness-110 shadow-sm' : 'group-hover:opacity-90'
                      }`}
                    />
                  </div>

                  <div className="mt-2 space-y-0.5">
                    <p className="text-[11px] font-black leading-tight text-gray-900 dark:text-gray-100 sm:text-xs">
                      <span className="sm:hidden">{bucket.shortTitle}</span>
                      <span className="hidden sm:inline">{bucket.title}</span>
                    </p>
                    <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 sm:text-[10px]">
                      {bucket.rangeLabel}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-[11px] text-gray-400 dark:border-gray-800/80">
            <span>
              {draftProductsCount > 0 ? (
                <>
                  <strong className="text-gray-600 dark:text-gray-300">{draftProductsCount}</strong> en borrador (sin receta)
                </>
              ) : (
                '100% del catálogo costea con receta'
              )}
            </span>
            <span className="hidden sm:inline">
              Haz clic en una columna para filtrar los productos abajo
            </span>
          </div>
        </div>
      )}
    </section>
  )
}