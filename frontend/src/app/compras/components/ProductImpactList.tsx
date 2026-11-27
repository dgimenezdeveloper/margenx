import { ArrowRight } from 'lucide-react'

import { formatPercent } from '@/lib/format'
import { HEALTH_BUCKET_META } from '@/lib/healthBucket'
import type { MarginImpactProduct } from '@/services/purchasingService'
import { BucketChip } from './BucketChip'

/** Sale de "En riesgo" o "Pérdida" y queda en objetivo o superávit: el mismo criterio que el resumen de la API. */
function leavesRiskOrLoss(product: MarginImpactProduct): boolean {
  return (
    (product.currentBucket === 'risk' || product.currentBucket === 'loss') &&
    (product.projectedBucket === 'target' || product.projectedBucket === 'surplus')
  )
}

/** Productos afectados por el cambio de proveedor de un insumo, con el margen antes y después. */
export function ProductImpactList({ products }: { products: MarginImpactProduct[] }) {
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {products.map((product) => (
        <li
          key={product.productId}
          aria-label={product.productName}
          className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0"
        >
          {/* Misma forma con nombre corto o largo: en el celular el margen va abajo y en escritorio, a la derecha (#497). */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {product.productName}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm tabular-nums">
              <span className="sr-only">Margen hoy </span>
              <span className="text-gray-600 dark:text-gray-400">{formatPercent(product.currentMarginPercent)}</span>
              <ArrowRight className="size-3.5 text-gray-400" aria-hidden="true" />
              <span className="sr-only">con la alternativa </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {formatPercent(product.projectedMarginPercent)}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <BucketChip bucket={product.currentBucket} />
            {product.projectedBucket !== product.currentBucket && (
              <>
                <ArrowRight className="size-3 text-gray-400" aria-hidden="true" />
                <BucketChip bucket={product.projectedBucket} />
              </>
            )}
            {leavesRiskOrLoss(product) && (
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Sale de {HEALTH_BUCKET_META[product.currentBucket].label}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
