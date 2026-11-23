'use client'

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Wallet } from 'lucide-react'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { formatMoney, formatPercent } from '@/lib/format'
import { formatProfit, profitTone } from '@/lib/profit'
import { cn } from '@/lib/utils'
import { salesSummaryService, type SalesSummary } from '@/services/salesSummaryService'

const TONE_CLASSES = {
  loss: 'text-rose-700 dark:text-rose-300',
  gain: 'text-emerald-700 dark:text-emerald-300',
  none: 'text-gray-900 dark:text-white',
} as const

function PeriodBlock({ label, summary }: { label: string; summary: SalesSummary }) {
  const hasSales = summary.salesCount > 0
  return (
    <div role="group" aria-label={label} className="min-w-0 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/60">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</p>
      {hasSales ? (
        <>
          <p className={cn('mt-1 text-xl font-black md:text-2xl', TONE_CLASSES[profitTone(summary.profit)])}>
            {formatProfit(summary.profit)}
          </p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            {summary.salesCount} {summary.salesCount === 1 ? 'venta' : 'ventas'} por {formatMoney(summary.salesTotal)}
            {summary.marginPercent !== null && <> · margen {formatPercent(summary.marginPercent)}</>}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">Sin ventas</p>
      )}
    </div>
  )
}

/**
 * Ganancia real en el panel (ADR-010): hoy y la semana, con el costo congelado de cada venta
 * y sin las anuladas. Solo para el ADMIN con el módulo de ventas (lo decide el panel).
 */
export function RealProfitCard() {
  const getToken = useTokenGetter()
  const [summaries, setSummaries] = useState<{ day: SalesSummary; week: SalesSummary } | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([salesSummaryService.get(getToken, 'day'), salesSummaryService.get(getToken, 'week')])
      .then(([day, week]) => {
        if (!cancelled) setSummaries({ day, week })
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [getToken, reloadKey])

  return (
    <section
      aria-label="Ganancia real"
      className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm md:p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold">Ganancia real</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">Lo que vendiste menos lo que te costó</p>
          </div>
        </div>
        <Link
          to="/ventas/ganancia"
          className={cn('inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300', CANONICAL_FOCUS_CLASSES)}
        >
          Ver el detalle
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-gray-700 dark:text-gray-300">No pudimos calcular la ganancia real.</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(false)
              setSummaries(null)
              setReloadKey((key) => key + 1)
            }}
            className={cn('min-h-11 cursor-pointer rounded-xl border border-gray-200 px-4 font-bold dark:border-gray-700', CANONICAL_FOCUS_CLASSES)}
          >
            Reintentar
          </button>
        </div>
      ) : summaries ? (
        <div className="grid grid-cols-2 gap-3">
          <PeriodBlock label="Hoy" summary={summaries.day} />
          <PeriodBlock label="Semana" summary={summaries.week} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3" aria-label="Cargando la ganancia real">
          <div className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      )}
    </section>
  )
}
