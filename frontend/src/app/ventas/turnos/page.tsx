'use client'

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, LoaderCircle, Wallet } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { CashShiftDifference } from '@/components/cash-shift-difference'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { useTokenGetter } from '@/hooks/useTokenGetter'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { moneyToCents } from '@/lib/cash-shift'
import { formatMoney } from '@/lib/format'
import { formatSaleDateTime } from '@/lib/sales'
import { cn } from '@/lib/utils'
import { cashShiftService, type CashShift } from '@/services/cashShiftService'

/**
 * Historial de turnos de caja (ADR-010), el más reciente primero, con lo vendido y la
 * diferencia del arqueo. El ADMIN ve todos; el colaborador, el abierto y los que abrió, cerró o en los que vendió.
 */
export default function CashShiftsPage() {
  const getToken = useTokenGetter()
  const [shifts, setShifts] = useState<CashShift[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    cashShiftService
      .list(getToken, { page })
      .then((response) => {
        if (cancelled) return
        setShifts((current) => (page === 1 ? response.data : [...current, ...response.data]))
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
  }, [getToken, page, reloadKey])

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-5 pb-28 md:pb-12">
          <Navbar title="Turnos de caja" backHref="/ventas" />
          <h2 className="text-xl font-black md:text-2xl">Turnos de caja</h2>

          {loadError ? (
            <ErrorState
              title="No pudimos cargar los turnos"
              description="Revisá tu conexión e intentá de nuevo."
              onRetry={() => {
                setIsLoading(true)
                setLoadError(false)
                setReloadKey((key) => key + 1)
              }}
            />
          ) : isLoading && shifts.length === 0 ? (
            <div className="space-y-3" aria-label="Cargando turnos">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
          ) : shifts.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-6" />}
              title="Todavía no hay turnos"
              description="Cada turno que abras y cierres queda acá con su arqueo."
            />
          ) : (
            <>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                {shifts.map((shift) => (
                  <li key={shift.id}>
                    <Link
                      to={`/ventas/turnos/${shift.id}`}
                      className={cn('flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60', CANONICAL_FOCUS_CLASSES)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          {/* La fecha y la hora no se separan aunque la diferencia de la derecha les quite lugar (#497). */}
                          <span className="whitespace-nowrap">{formatSaleDateTime(shift.openedAt)}</span>
                          <span
                            className={cn(
                              'ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold',
                              shift.status === 'OPEN'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                            )}
                          >
                            {shift.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {shift.salesCount} {shift.salesCount === 1 ? 'venta' : 'ventas'} · {formatMoney(shift.salesTotal)}
                        </p>
                      </div>
                      {shift.difference !== null && (
                        <CashShiftDifference cents={moneyToCents(shift.difference)} className="text-sm" />
                      )}
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
