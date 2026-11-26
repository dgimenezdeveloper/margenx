'use client'

import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { LoaderCircle, Wallet } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { CashShiftDifference } from '@/components/cash-shift-difference'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTokenGetter } from '@/hooks/useTokenGetter'
import { CANONICAL_FOCUS_CLASSES, CANONICAL_INPUT_CLASSES } from '@/lib/accessibility'
import { moneyToCents, parseMoneyInput } from '@/lib/cash-shift'
import { formatMoney } from '@/lib/format'
import { ABOVE_BOTTOM_NAV_CLASS } from '@/lib/mobile-layout'
import { PAYMENT_METHOD_LABELS, formatSaleDateTime } from '@/lib/sales'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { cashShiftService, type CashShift } from '@/services/cashShiftService'
import type { PaymentMethod } from '@/services/saleService'

type Counted = Record<PaymentMethod, string>

/** Cómo se lee cada campo: "Contado en efectivo". */
const COUNTED_SUFFIX: Record<PaymentMethod, string> = {
  CASH: 'en efectivo',
  TRANSFER: 'por transferencia',
  MERCADO_PAGO: 'por Mercado Pago',
}

const INVALID_AMOUNT_MESSAGE = 'Escribí un monto, por ejemplo 34.500.'

/** Medios que vienen precargados con lo esperado: el efectivo siempre se cuenta. */
const PREFILLED_METHODS: PaymentMethod[] = ['TRANSFER', 'MERCADO_PAGO']

/** "8400,00": como lo escribiría el comerciante, para precargar transferencia y Mercado Pago. */
function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** Lo esperado de un medio de pago, tal como lo precarga la pantalla. */
function expectedInput(shift: CashShift, method: PaymentMethod): string {
  return centsToInput(moneyToCents(shift.methods.find((row) => row.paymentMethod === method)?.expected ?? '0'))
}

/** Lo que define el arqueo: si cambia, entraron o se anularon ventas desde que se abrió la pantalla. */
function arqueoSnapshot(shift: CashShift): string {
  return [shift.status, shift.salesCount, shift.voidedCount, ...shift.methods.map((row) => `${row.paymentMethod}:${row.expected}`)].join('|')
}

/**
 * Cierre de caja (ADR-010): lo esperado por medio de pago, lo contado y la diferencia
 * resaltada. Transferencia y Mercado Pago vienen precargados con lo esperado; el efectivo
 * se cuenta. Cerrar es definitivo: después no se vende ni se anula en este turno.
 */
export default function CloseCashShiftPage() {
  const { id = '' } = useParams()
  return <CloseCashShift key={id} id={id} />
}

function CloseCashShift({ id }: { id: string }) {
  const navigate = useNavigate()
  const getToken = useTokenGetter()

  const [shift, setShift] = useState<CashShift | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<'not-found' | 'failed' | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [counted, setCounted] = useState<Counted>({ CASH: '', TRANSFER: '', MERCADO_PAGO: '' })
  const [showConfirm, setShowConfirm] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [expectedChanged, setExpectedChanged] = useState(false)

  useEffect(() => {
    let cancelled = false
    cashShiftService
      .getById(getToken, id)
      .then((data) => {
        if (cancelled) return
        setShift(data)
        setCounted({ CASH: '', TRANSFER: expectedInput(data, 'TRANSFER'), MERCADO_PAGO: expectedInput(data, 'MERCADO_PAGO') })
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError && err.status === 404 ? 'not-found' : 'failed')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getToken, id, reloadKey])

  if (shift?.status === 'CLOSED') {
    return <Navigate to={`/ventas/turnos/${shift.id}`} replace />
  }

  const rows = (shift?.methods ?? []).map((row) => {
    const countedCents = parseMoneyInput(counted[row.paymentMethod])
    const expectedCents = moneyToCents(row.expected)
    return { ...row, expectedCents, countedCents, differenceCents: countedCents === null ? null : countedCents - expectedCents }
  })
  const allCounted = rows.length > 0 && rows.every((row) => row.countedCents !== null)
  const expectedTotal = rows.reduce((total, row) => total + row.expectedCents, 0)
  const countedTotal = rows.reduce((total, row) => total + (row.countedCents ?? 0), 0)

  const handleClose = async () => {
    if (!shift || !allCounted || isClosing) return
    setIsClosing(true)
    setCloseError(null)
    setExpectedChanged(false)
    const amount = (method: PaymentMethod) => (rows.find((row) => row.paymentMethod === method)?.countedCents ?? 0) / 100
    try {
      // Con varios vendedores, una venta puede entrar mientras se cuenta la caja. Antes de cerrar
      // se vuelve a pedir lo esperado: si cambió, se actualiza en pantalla y se pide revisar, para
      // que la diferencia guardada sea la misma que se vio. Lo precargado que nadie tocó se
      // actualiza; lo que la persona corrigió a mano se respeta.
      const latest = await cashShiftService.getById(getToken, shift.id)
      if (arqueoSnapshot(latest) !== arqueoSnapshot(shift)) {
        setCounted((current) => {
          const next = { ...current }
          for (const method of PREFILLED_METHODS) {
            if (current[method] === expectedInput(shift, method)) next[method] = expectedInput(latest, method)
          }
          return next
        })
        // Si otra persona ya lo cerró, el estado CLOSED lleva al resumen.
        setShift(latest)
        setShowConfirm(false)
        setExpectedChanged(true)
        setIsClosing(false)
        return
      }

      await cashShiftService.close(getToken, shift.id, {
        countedCash: amount('CASH'),
        countedTransfer: amount('TRANSFER'),
        countedMercadoPago: amount('MERCADO_PAGO'),
      })
      navigate(`/ventas/turnos/${shift.id}`, { replace: true })
    } catch (err) {
      setCloseError(err instanceof ApiError ? err.message : 'No se pudo cerrar el turno. Revisá tu conexión e intentá de nuevo.')
      setIsClosing(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Ancho de las demás pantallas, para que entre la barra de escritorio (#495). */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        {/* Lugar abajo para el panel fijo del resultado del arqueo, también en escritorio (#495). */}
        <div className="flex flex-col gap-5 pb-60 md:pb-48">
          <Navbar title="Cerrar turno" backHref="/ventas" />

          {/* El formulario sigue angosto y alineado con el panel de abajo. */}
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {isLoading ? (
              <div className="h-80 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" aria-label="Cargando el turno" />
            ) : error === 'not-found' ? (
              <EmptyState icon={<Wallet className="size-6" />} title="El turno no existe" description="Puede que el enlace esté mal o que el turno sea de otra persona." />
            ) : error || !shift ? (
              <ErrorState
                title="No pudimos cargar el turno"
                description="Revisá tu conexión e intentá de nuevo."
                onRetry={() => {
                  setIsLoading(true)
                  setError(null)
                  setReloadKey((key) => key + 1)
                }}
              />
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-black">Arqueo de caja</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Turno abierto el {formatSaleDateTime(shift.openedAt)}
                    {shift.openedBy ? ` por ${shift.openedBy}` : ''} · {shift.salesCount}{' '}
                    {shift.salesCount === 1 ? 'venta' : 'ventas'}
                    {shift.voidedCount > 0 ? ` · ${shift.voidedCount} ${shift.voidedCount === 1 ? 'anulada' : 'anuladas'}` : ''}
                  </p>
                </div>

                {expectedChanged && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    Mientras contabas entraron o se anularon ventas. Ya actualizamos lo esperado: revisá lo contado y volvé a
                    cerrar el turno.
                  </p>
                )}

                {rows.map((row) => {
                  const inputId = `counted-${row.paymentMethod}`
                  const invalid = counted[row.paymentMethod].trim() !== '' && row.countedCents === null
                  return (
                    <fieldset
                      key={row.paymentMethod}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <legend className="sr-only">{PAYMENT_METHOD_LABELS[row.paymentMethod]}</legend>
                      <div className="flex items-baseline justify-between gap-3">
                        <p aria-hidden="true" className="font-bold">
                          {PAYMENT_METHOD_LABELS[row.paymentMethod]}
                        </p>
                        <p className="text-right text-sm">
                          <span className="block text-xs text-gray-600 dark:text-gray-400">Esperado</span>
                          <span className="text-base font-black">{formatMoney(row.expected)}</span>
                        </p>
                      </div>
                      {row.paymentMethod === 'CASH' && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Inicial {formatMoney(shift.openingAmount)} + ventas {formatMoney(row.salesTotal)}
                        </p>
                      )}
                      <label htmlFor={inputId} className="mt-3 block text-sm font-semibold">
                        Contado<span className="sr-only"> {COUNTED_SUFFIX[row.paymentMethod]}</span>
                      </label>
                      <input
                        id={inputId}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={counted[row.paymentMethod]}
                        onChange={(event) => setCounted((current) => ({ ...current, [row.paymentMethod]: event.target.value }))}
                        placeholder={row.paymentMethod === 'CASH' ? 'Contá la plata de la caja' : undefined}
                        aria-invalid={invalid ? true : undefined}
                        aria-describedby={invalid ? `${inputId}-error` : undefined}
                        className={cn(
                          'mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base dark:border-gray-700 dark:bg-gray-900',
                          CANONICAL_INPUT_CLASSES
                        )}
                      />
                      {invalid && (
                        <p id={`${inputId}-error`} className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-300">
                          {INVALID_AMOUNT_MESSAGE}
                        </p>
                      )}
                      {row.differenceCents !== null && (
                        <p className="mt-2 text-sm" aria-live="polite">
                          <CashShiftDifference cents={row.differenceCents} testId="difference" />
                        </p>
                      )}
                    </fieldset>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {shift && (
        <section
          aria-label="Resultado del arqueo"
          className={cn(
            'fixed inset-x-0 z-10 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95',
            ABOVE_BOTTOM_NAV_CLASS,
            'md:bottom-0'
          )}
        >
          <div className="mx-auto flex max-w-md flex-col gap-2 md:max-w-3xl">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Esperado</span>
              <span className="font-bold">{formatMoney(expectedTotal / 100)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Contado</span>
              <span className="font-bold">{allCounted ? formatMoney(countedTotal / 100) : '—'}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Diferencia</span>
              {allCounted ? (
                <CashShiftDifference cents={countedTotal - expectedTotal} testId="total-difference" className="text-xl" />
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">Falta contar</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setCloseError(null)
                setShowConfirm(true)
              }}
              disabled={!allCounted}
              className={cn(
                'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 text-base font-black text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              Cerrar turno
            </button>
          </div>
        </section>
      )}

      <Dialog
        open={showConfirm}
        onOpenChange={(open) => {
          if (!open && !isClosing) setShowConfirm(false)
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>¿Cerrar el turno?</DialogTitle>
            <DialogDescription>
              El arqueo queda guardado y en este turno ya no se puede vender ni anular. Para seguir cobrando, abrí un turno nuevo.
            </DialogDescription>
            {closeError && (
              <p role="alert" className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {closeError}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <DialogClose
                disabled={isClosing}
                className={cn(
                  'min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                Volver
              </DialogClose>
              <button
                type="button"
                onClick={handleClose}
                disabled={isClosing}
                className={cn(
                  'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                {isClosing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : 'Sí, cerrar'}
              </button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      <BottomNav />
    </main>
  )
}
