'use client'

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, LoaderCircle, Plus, Receipt } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { useTokenGetter } from '@/hooks/useTokenGetter'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { formatMoney } from '@/lib/format'
import { PAYMENT_METHOD_LABELS, argentinaToday, formatSaleDateTime, formatTicketNumber } from '@/lib/sales'
import { cn } from '@/lib/utils'
import { saleService, type SaleListItem } from '@/services/saleService'

type Period = 'today' | 'all'

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: 'all', label: 'Todas' },
]

/**
 * Historial de ventas (ADR-010): las del día o todas, la más reciente primero. El ADMIN ve
 * las de la cuenta; el colaborador, las suyas. Cada venta abre su ticket, donde se anula.
 */
export default function SalesHistoryPage() {
  const getToken = useTokenGetter()
  const [period, setPeriod] = useState<Period>('today')
  const [sales, setSales] = useState<SaleListItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    saleService
      .list(getToken, { page, date: period === 'today' ? argentinaToday() : undefined })
      .then((response) => {
        if (cancelled) return
        setSales((current) => (page === 1 ? response.data : [...current, ...response.data]))
        setTotalPages(response.meta.totalPages)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getToken, page, period, reloadKey])

  const changePeriod = (next: Period) => {
    if (next === period) return
    setIsLoading(true)
    setLoadError(false)
    setSales([])
    setPage(1)
    setPeriod(next)
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-5 pb-28 md:pb-12">
          <Navbar title="Ventas" titleMobileOnly />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black md:text-2xl">Ventas</h2>
            <Link
              to="/ventas/nueva"
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md hover:bg-indigo-700',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              <Plus className="size-4" aria-hidden="true" />
              Nueva venta
            </Link>
          </div>

          <div role="group" aria-label="Período" className="inline-flex self-start rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => changePeriod(value)}
                className={cn(
                  'min-h-9 cursor-pointer rounded-lg px-4 text-sm font-bold',
                  period === value
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loadError ? (
            <ErrorState
              title="No pudimos cargar las ventas"
              description="Revisá tu conexión e intentá de nuevo."
              onRetry={() => {
                setIsLoading(true)
                setLoadError(false)
                setReloadKey((key) => key + 1)
              }}
            />
          ) : isLoading && sales.length === 0 ? (
            <div className="space-y-3" aria-label="Cargando ventas">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <EmptyState
              icon={<Receipt className="size-6" />}
              title={period === 'today' ? 'Todavía no hay ventas hoy' : 'Todavía no hay ventas'}
              description="Cada venta que cobres queda acá con su ticket."
            />
          ) : (
            <>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                {sales.map((sale) => (
                  <li key={sale.id}>
                    <Link
                      to={`/ventas/${sale.id}/ticket`}
                      className={cn('flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60', CANONICAL_FOCUS_CLASSES)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          Ticket {formatTicketNumber(sale.ticketNumber)}
                          {sale.status === 'VOIDED' && (
                            <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                              Anulada
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatSaleDateTime(sale.soldAt)} · {PAYMENT_METHOD_LABELS[sale.paymentMethod]} · {sale.itemsCount}{' '}
                          {sale.itemsCount === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                      <span className={cn('text-sm font-black', sale.status === 'VOIDED' && 'text-gray-500 line-through')}>
                        {formatMoney(sale.total)}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              {page < totalPages && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true)
                    setPage((current) => current + 1)
                  }}
                  disabled={isLoading}
                  className={cn(
                    'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                    CANONICAL_FOCUS_CLASSES
                  )}
                >
                  {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
                  Cargar más
                </button>
              )}
            </>
          )}
        </div>
        <DesktopFooter />
      </div>
      <BottomNav />
    </main>
  )
}
