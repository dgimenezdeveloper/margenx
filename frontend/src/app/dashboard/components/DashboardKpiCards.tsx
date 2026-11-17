import { AlertTriangle, Boxes, TrendingDown, TrendingUp } from 'lucide-react'
import type { DashboardMetrics } from '@/services/dashboardService'
import { formatPercent } from '@/lib/format'

/** El color del margen promedio sigue su signo: un margen negativo nunca se pinta en verde. */
function marginTone(value: number) {
  if (value < 0) {
    return {
      Icon: TrendingDown,
      icon: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
      text: 'text-rose-700 dark:text-rose-300',
    }
  }
  if (value > 0) {
    return {
      Icon: TrendingUp,
      icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      text: 'text-emerald-700 dark:text-emerald-300',
    }
  }
  return {
    Icon: TrendingUp,
    icon: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    text: 'text-gray-900 dark:text-white',
  }
}

interface DashboardKpiCardsProps {
  metrics: DashboardMetrics | null
  isLoading: boolean
}

/**
 * Componente especializado para mostrar las métricas clave (KPIs) del negocio.
 * Incluye su propio estado de carga (Skeleton) independiente y guarda defensiva
 * para evitar mostrar ceros ficticios cuando metrics es null debido a un fallo.
 */
export function DashboardKpiCards({ metrics, isLoading }: DashboardKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="hidden h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 md:block" />
        <div className="hidden h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 md:block" />
      </div>
    )
  }

  // Guarda defensiva: si metrics es null y no está cargando (falla de API),
  // no renderiza tarjetas en cero para evitar la falsa sensación de salud financiera.
  if (!metrics) {
    return null
  }

  const margin = marginTone(metrics.averageMarginPercent)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className="flex items-center gap-3.5 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-800/80 dark:bg-rose-950/40">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20">
          <AlertTriangle className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-rose-700 dark:text-rose-100">
            {metrics.criticalProductsCount}{' '}
            {metrics.criticalProductsCount === 1 ? 'Producto en Riesgo' : 'Productos en Riesgo'}
          </p>
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
            Margen por debajo del umbral mínimo
          </p>
        </div>
      </section>

      <div className="hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:flex md:items-center md:gap-3.5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <Boxes className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400">Insumos Activos</p>
          <p className="text-xl font-black text-gray-900 dark:text-white">
            {metrics.activeIngredientsCount} Insumos
          </p>
        </div>
      </div>

      <div className="hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:flex md:items-center md:gap-3.5 dark:border-gray-800 dark:bg-gray-900">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${margin.icon}`}>
          <margin.Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400">Margen Promedio</p>
          <p data-testid="average-margin" className={`text-xl font-black ${margin.text}`}>
            {formatPercent(metrics.averageMarginPercent)}
          </p>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Mediana de los productos con receta
          </p>
        </div>
      </div>
    </div>
  )
}