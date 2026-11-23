'use client'

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { useTokenGetter } from '@/hooks/useTokenGetter'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { formatMoney, formatPercent } from '@/lib/format'
import { formatIsoDay, formatProfit, profitTone } from '@/lib/profit'
import { cn } from '@/lib/utils'
import { salesSummaryService, type RankedProduct, type SalesSummary, type SummaryPeriod } from '@/services/salesSummaryService'

const PERIODS: Array<{ value: SummaryPeriod; label: string; previous: string }> = [
  { value: 'day', label: 'Hoy', previous: 'ayer' },
  { value: 'week', label: 'Semana', previous: 'la semana anterior' },
  { value: 'month', label: 'Mes', previous: 'los 30 días anteriores' },
]

const TONE_CLASSES = {
  loss: 'text-rose-700 dark:text-rose-300',
  gain: 'text-emerald-700 dark:text-emerald-300',
  none: 'text-gray-900 dark:text-white',
} as const

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/60">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</p>
      <p className={cn('mt-1 truncate text-lg font-black md:text-xl', className)}>{value}</p>
    </div>
  )
}

/** "+35,7 %", o "−12,0 %": la variación con su signo. */
function formatChange(value: string): string {
  const formatted = formatPercent(Math.abs(Number(value)))
  if (Number(value) > 0) return `+${formatted}`
  if (Number(value) < 0) return `−${formatted}`
  return formatted
}

function Ranking({ title, products, value }: { title: string; products: RankedProduct[]; value: 'quantity' | 'profit' }) {
  if (products.length === 0) return null
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      <table className="w-full text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm font-bold">{title}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">{value === 'quantity' ? 'Unidades' : 'Ganancia'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {products.map((product) => (
            <tr key={`${product.productId ?? product.productName}`}>
              <th scope="row" className="px-4 py-2.5 font-semibold">
                <span className="block break-words">{product.productName}</span>
                <span className="block text-xs font-normal text-gray-600 dark:text-gray-400">
                  {value === 'quantity'
                    ? `${formatMoney(product.salesTotal)} vendidos`
                    : `${product.quantity} ${product.quantity === 1 ? 'unidad' : 'unidades'}${product.marginPercent !== null ? ` · margen ${formatPercent(product.marginPercent)}` : ''}`}
                </span>
              </th>
              <td className={cn('px-4 py-2.5 text-right font-black whitespace-nowrap', value === 'profit' && TONE_CLASSES[profitTone(product.profit)])}>
                {value === 'quantity' ? product.quantity : formatProfit(product.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Ganancia real (ADR-010): ventas, costo congelado, ganancia y margen ponderado del día, la
 * semana o el mes, comparados con el período anterior, y los dos rankings. Solo para el ADMIN.
 */
export default function RealProfitPage() {
  const getToken = useTokenGetter()
  const [period, setPeriod] = useState<SummaryPeriod>('week')
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    salesSummaryService
      .get(getToken, period)
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [getToken, period, reloadKey])

  const meta = PERIODS.find((p) => p.value === period) ?? PERIODS[1]!

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-5 pb-28 md:pb-12">
          <Navbar title="Ganancia real" backHref="/dashboard" />
          <div>
            <h2 className="text-xl font-black md:text-2xl">Ganancia real</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Lo que vendiste menos lo que te costó cada producto el día de la venta. Sin las ventas anuladas.
            </p>
          </div>

          <div role="group" aria-label="Período" className="inline-flex self-start rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => {
                  if (value === period) return
                  setSummary(null)
                  setLoadError(false)
                  setPeriod(value)
                }}
                className={cn(
                  'min-h-11 cursor-pointer rounded-lg px-4 text-sm font-bold',
                  period === value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loadError ? (
            <ErrorState
              title="No pudimos calcular la ganancia real"
              description="Revisá tu conexión e intentá de nuevo."
              onRetry={() => {
                setLoadError(false)
                setReloadKey((key) => key + 1)
              }}
            />
          ) : !summary ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Cargando la ganancia real">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
          ) : summary.salesCount === 0 ? (
            <EmptyState
              icon={<TrendingUp className="size-6" />}
              title="No hubo ventas en este período"
              description="Cuando cobres ventas, acá vas a ver cuánto ganaste de verdad."
            />
          ) : (
            <>
              <section aria-label="Totales del período" className="flex flex-col gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {summary.from === summary.to ? `El ${formatIsoDay(summary.from)}` : `Del ${formatIsoDay(summary.from)} al ${formatIsoDay(summary.to)}`}
                  {' · '}
                  {summary.salesCount} {summary.salesCount === 1 ? 'venta' : 'ventas'}
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Figure label="Ventas" value={formatMoney(summary.salesTotal)} />
                  <Figure label="Costo" value={formatMoney(summary.costTotal)} />
                  <Figure label="Ganancia real" value={formatProfit(summary.profit)} className={TONE_CLASSES[profitTone(summary.profit)]} />
                  <Figure label="Margen" value={summary.marginPercent === null ? '—' : formatPercent(summary.marginPercent)} />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {summary.change.profit === null
                    ? `Sin ganancia para comparar con ${meta.previous}.`
                    : `Ganancia ${formatChange(summary.change.profit)} contra ${meta.previous} (${formatProfit(summary.previous.profit)}).`}
                </p>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <Ranking title="Los más vendidos" products={summary.topSold} value="quantity" />
                <Ranking title="Los que más ganancia dejan" products={summary.topProfit} value="profit" />
              </div>
            </>
          )}
        </div>
        <DesktopFooter />
      </div>
      <BottomNav />
    </main>
  )
}
