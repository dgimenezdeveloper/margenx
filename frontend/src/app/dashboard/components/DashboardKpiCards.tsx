import { AlertTriangle, Boxes, TrendingDown, TrendingUp } from 'lucide-react'
import type { DashboardMetrics } from '@/services/dashboardService'
import { formatPercent } from '@/lib/format'
import { HEALTH_BUCKET_META } from '@/lib/healthBucket'

/**
 * El color del margen promedio sigue su signo: un margen negativo nunca se pinta en verde.
 * `tile` es el fondo de la tarjeta en el celular, donde se ve como las de Proveedores.
 */
function marginTone(value: number) {
  if (value < 0) {
    return {
      Icon: TrendingDown,
      icon: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
      text: 'text-rose-700 dark:text-rose-300',
      tile: 'bg-rose-50 dark:bg-rose-950/60',
    }
  }
  if (value > 0) {
    return {
      Icon: TrendingUp,
      icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      text: 'text-emerald-700 dark:text-emerald-300',
      tile: 'bg-emerald-50 dark:bg-emerald-950/60',
    }
  }
  return {
    Icon: TrendingUp,
    icon: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    text: 'text-gray-900 dark:text-white',
    tile: 'bg-gray-100 dark:bg-gray-800',
  }
}

/** Grilla de tres tarjetas en todos los anchos, como las de Proveedores (#362). */
const GRID_CLASSES = 'grid grid-cols-3 gap-3 md:gap-4'

/**
 * En el celular, tarjeta compacta de color con rótulo y número; desde la tableta, la tarjeta
 * blanca con ícono. Las de insumos y margen cambian a blanco con borde desde `md`.
 */
const TILE_CLASSES = 'min-w-0 rounded-2xl p-3 md:flex md:items-center md:gap-3.5 md:p-5 md:shadow-sm'
const NEUTRAL_DESKTOP_CLASSES =
  'md:border md:border-gray-100 md:bg-white md:dark:border-gray-800 md:dark:bg-gray-900'
const LABEL_CLASSES = 'text-[11px] font-semibold leading-tight md:text-xs'
/** A 360 px cada tarjeta tiene unos 77 px útiles: un margen como "-12,4 %" baja de renglón antes que desbordar. */
const VALUE_CLASSES = 'mt-1 text-lg font-black leading-tight wrap-anywhere md:text-2xl'
/** Aclaración que en el celular no entra en la tarjeta: queda para el lector de pantalla. */
const NOTE_CLASSES = 'sr-only text-[11px] font-medium md:not-sr-only md:mt-0.5'
const ICON_CLASSES = 'hidden size-11 shrink-0 items-center justify-center rounded-xl md:flex'

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
      <div className={GRID_CLASSES}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 md:h-24 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  // Guarda defensiva: si metrics es null y no está cargando (falla de API),
  // no renderiza tarjetas en cero para evitar la falsa sensación de salud financiera.
  if (!metrics) {
    return null
  }

  const margin = marginTone(metrics.averageMarginPercent)
  const criticalLabel =
    metrics.criticalProductsCount === 1 ? 'Producto debajo de su mínimo' : 'Productos debajo de su mínimo'

  return (
    <div className={GRID_CLASSES}>
      <section
        data-testid="kpi-card"
        className={`${TILE_CLASSES} bg-rose-50 md:border md:border-rose-200 dark:bg-rose-950/40 md:dark:border-rose-800/80`}
      >
        <div className={`${ICON_CLASSES} bg-rose-500 text-white shadow-md shadow-rose-500/20`}>
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className={`${LABEL_CLASSES} text-rose-800 dark:text-rose-200`}>
            <span className="md:hidden">Debajo de su mínimo</span>
            <span className="hidden md:inline">{criticalLabel}</span>
          </p>
          <p data-testid="critical-count" className={`${VALUE_CLASSES} text-rose-950 dark:text-rose-100`}>
            {metrics.criticalProductsCount}
          </p>
          {/* Suma dos estados del glosario: no usa el nombre de ninguno para no contar distinto que el histograma (#358). */}
          <p className={`${NOTE_CLASSES} text-rose-700 dark:text-rose-300`}>
            {HEALTH_BUCKET_META.loss.label} o {HEALTH_BUCKET_META.risk.label}
          </p>
        </div>
      </section>

      <section
        data-testid="kpi-card"
        className={`${TILE_CLASSES} bg-indigo-50 dark:bg-indigo-950/60 ${NEUTRAL_DESKTOP_CLASSES}`}
      >
        <div className={`${ICON_CLASSES} bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300`}>
          <Boxes className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className={`${LABEL_CLASSES} text-indigo-700 md:text-gray-600 dark:text-indigo-300 md:dark:text-gray-400`}>
            Insumos activos
          </p>
          <p data-testid="active-ingredients" className={`${VALUE_CLASSES} text-indigo-950 md:text-gray-900 dark:text-indigo-100 md:dark:text-white`}>
            {metrics.activeIngredientsCount}
          </p>
        </div>
      </section>

      <section data-testid="kpi-card" className={`${TILE_CLASSES} ${margin.tile} ${NEUTRAL_DESKTOP_CLASSES}`}>
        <div className={`${ICON_CLASSES} ${margin.icon}`}>
          <margin.Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className={`${LABEL_CLASSES} text-gray-700 md:text-gray-600 dark:text-gray-300 md:dark:text-gray-400`}>
            Margen promedio
          </p>
          <p data-testid="average-margin" className={`${VALUE_CLASSES} ${margin.text}`}>
            {formatPercent(metrics.averageMarginPercent)}
          </p>
          <p className={`${NOTE_CLASSES} text-gray-600 dark:text-gray-400`}>Mediana de los productos con receta</p>
        </div>
      </section>
    </div>
  )
}
