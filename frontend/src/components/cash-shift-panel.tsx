'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { History, LoaderCircle, LockKeyhole, Wallet } from 'lucide-react'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import { CANONICAL_FOCUS_CLASSES, CANONICAL_INPUT_CLASSES } from '@/lib/accessibility'
import { parseMoneyInput } from '@/lib/cash-shift'
import { formatMoney } from '@/lib/format'
import { formatSaleDateTime } from '@/lib/sales'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { cashShiftService, type CashShift } from '@/services/cashShiftService'

interface CashShiftPanelProps {
  /** `undefined` mientras carga; `null` si no hay turno abierto. */
  shift: CashShift | null | undefined
  loadError: boolean
  onRetry: () => void
  onOpened: (shift: CashShift) => void
  /** Otra persona abrió el turno al mismo tiempo: hay que volver a pedirlo. */
  onConflict: () => void
}

const LINK_CLASSES =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold'

/**
 * Turno de caja en `/ventas` (ADR-010): sin turno, la apertura con el monto inicial; con
 * turno, quién lo abrió, lo vendido y el acceso al cierre. ADMIN y colaborador abren y cierran.
 */
export function CashShiftPanel({ shift, loadError, onRetry, onOpened, onConflict }: CashShiftPanelProps) {
  const getToken = useTokenGetter()
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [isOpening, setIsOpening] = useState(false)

  const handleOpen = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isOpening) return
    const cents = parseMoneyInput(amount)
    if (cents === null) {
      setAmountError('Escribí el monto inicial, por ejemplo 10.000.')
      return
    }
    setAmountError(null)
    setApiMessage(null)
    setIsOpening(true)
    try {
      onOpened(await cashShiftService.open(getToken, cents / 100))
      setAmount('')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setApiMessage(error.message)
        onConflict()
      } else {
        setApiMessage(error instanceof ApiError ? error.message : 'No se pudo abrir el turno. Revisá tu conexión e intentá de nuevo.')
      }
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <section
      aria-label="Turno de caja"
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      {apiMessage && (
        <p role="status" className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          {apiMessage}
        </p>
      )}

      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-gray-700 dark:text-gray-300">No pudimos ver el turno de caja.</p>
          <button
            type="button"
            onClick={onRetry}
            className={cn(LINK_CLASSES, 'cursor-pointer border border-gray-200 dark:border-gray-700', CANONICAL_FOCUS_CLASSES)}
          >
            Reintentar
          </button>
        </div>
      ) : shift === undefined ? (
        <div className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-label="Cargando el turno" />
      ) : shift === null ? (
        <form onSubmit={handleOpen} noValidate className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden="true" />
            <div>
              <p className="font-bold">No hay un turno abierto</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Abrí el turno con la plata que hay en la caja para empezar a cobrar.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-semibold">
              Monto inicial en caja
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="10.000"
                aria-invalid={amountError ? true : undefined}
                aria-describedby={amountError ? 'opening-amount-error' : undefined}
                className={cn(
                  'mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base font-normal dark:border-gray-700 dark:bg-gray-900',
                  CANONICAL_INPUT_CLASSES
                )}
              />
            </label>
            <button
              type="submit"
              disabled={isOpening}
              className={cn(
                LINK_CLASSES,
                'cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              {isOpening ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              Abrir turno
            </button>
          </div>
          {amountError && (
            <p id="opening-amount-error" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              {amountError}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Wallet className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-bold">
                <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  Turno abierto
                </span>
              </p>
              <p className="mt-1 break-words text-sm text-gray-600 dark:text-gray-400">
                Desde {formatSaleDateTime(shift.openedAt)}
                {shift.openedBy ? ` · ${shift.openedBy}` : ''}
              </p>
              <p className="text-sm font-semibold">
                {/* Total del turno, de todos los que cobraron: el colaborador ve en la lista solo las suyas (#497). */}
                {shift.salesCount} {shift.salesCount === 1 ? 'venta' : 'ventas'} en el turno · {formatMoney(shift.salesTotal)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/ventas/turnos/${shift.id}/cerrar`}
              className={cn(LINK_CLASSES, 'bg-indigo-600 text-white hover:bg-indigo-700', CANONICAL_FOCUS_CLASSES)}
            >
              Cerrar turno
            </Link>
            <Link
              to="/ventas/turnos"
              className={cn(
                LINK_CLASSES,
                'border border-gray-200 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              <History className="size-4" aria-hidden="true" />
              Ver turnos
            </Link>
          </div>
        </div>
      )}

      {shift === null && !loadError && (
        <Link
          to="/ventas/turnos"
          className={cn('mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300', CANONICAL_FOCUS_CLASSES)}
        >
          <History className="size-4" aria-hidden="true" />
          Ver turnos
        </Link>
      )}
    </section>
  )
}
