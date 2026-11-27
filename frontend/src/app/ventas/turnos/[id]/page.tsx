'use client'

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { History, Printer, ReceiptText, Wallet } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { CashShiftDifference } from '@/components/cash-shift-difference'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PrintBrandHeader, PrintBrandSignature } from '@/components/print-brand'
import { useTokenGetter } from '@/hooks/useTokenGetter'
import { CANONICAL_FOCUS_CLASSES, CANONICAL_INPUT_CLASSES } from '@/lib/accessibility'
import { formatDifference, moneyToCents } from '@/lib/cash-shift'
import { formatMoney } from '@/lib/format'
import { PRINT_CSS, PRINT_FORMATS, type PrintFormat } from '@/lib/print'
import { PAYMENT_METHOD_LABELS, formatSaleDateTime } from '@/lib/sales'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { cashShiftService, type CashShift } from '@/services/cashShiftService'

const BUTTON_CLASSES =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold'

const SECONDARY_CLASSES =
  'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'

function plural(count: number, singular: string, pluralWord: string): string {
  return `${count} ${count === 1 ? singular : pluralWord}`
}

/**
 * Resumen del turno (ADR-010). Cerrado: el arqueo guardado por medio de pago, la diferencia
 * total y las ventas anuladas, listo para imprimir en ticketera o en A4. Abierto: lo esperado
 * hasta ahora y el acceso al cierre.
 */
export default function CashShiftSummaryPage() {
  const { id = '' } = useParams()
  return <CashShiftSummary key={id} id={id} />
}

function CashShiftSummary({ id }: { id: string }) {
  const getToken = useTokenGetter()
  const [shift, setShift] = useState<CashShift | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<'not-found' | 'failed' | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [printFormat, setPrintFormat] = useState<PrintFormat>('80')

  useEffect(() => {
    let cancelled = false
    cashShiftService
      .getById(getToken, id)
      .then((data) => {
        if (!cancelled) setShift(data)
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

  const print = () => window.requestAnimationFrame(() => window.print())
  const isClosed = shift?.status === 'CLOSED'
  const title = isClosed ? 'Cierre de caja' : 'Turno abierto'

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 print:min-h-0 print:bg-white print:text-black">
      <style>{`@media print { ${PRINT_CSS[printFormat]} }`}</style>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12 print:m-0 print:max-w-none print:p-0">
        <div className="flex flex-col gap-5 pb-28 md:pb-12 print:gap-0 print:pb-0">
          <div className="print:hidden">
            <Navbar title="Turno de caja" backHref="/ventas/turnos" />
          </div>

          {isLoading ? (
            <div className="mx-auto h-96 w-full max-w-sm animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" aria-label="Cargando el turno" />
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
              <article
                aria-label={title}
                className="mx-ticket mx-auto w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 font-mono text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none"
              >
                <header className="border-b border-dashed border-gray-300 pb-3 text-center dark:border-gray-600 print:border-black">
                  <PrintBrandHeader />
                  {shift.businessName && <p className="text-base font-black">{shift.businessName}</p>}
                  <h2 className="font-bold">{title}</h2>
                </header>

                <div className="space-y-1 border-b border-dashed border-gray-300 py-3 dark:border-gray-600 print:border-black">
                  <p>
                    Abrió: {formatSaleDateTime(shift.openedAt)}
                    {shift.openedBy && <span className="block break-all text-xs">{shift.openedBy}</span>}
                  </p>
                  {shift.closedAt && (
                    <p>
                      Cerró: {formatSaleDateTime(shift.closedAt)}
                      {shift.closedBy && <span className="block break-all text-xs">{shift.closedBy}</span>}
                    </p>
                  )}
                  <p className="flex justify-between gap-3">
                    <span>Monto inicial</span>
                    <span>{formatMoney(shift.openingAmount)}</span>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span>Vendido</span>
                    <span>{formatMoney(shift.salesTotal)}</span>
                  </p>
                  <p>
                    {plural(shift.salesCount, 'venta', 'ventas')}
                    {shift.voidedCount > 0 ? ` · ${plural(shift.voidedCount, 'anulada', 'anuladas')}` : ''}
                  </p>
                </div>

                {shift.methods.map((row) => (
                  <table key={row.paymentMethod} className="w-full border-b border-dashed border-gray-300 py-2 dark:border-gray-600 print:border-black">
                    <caption className="pt-3 text-left font-bold">{PAYMENT_METHOD_LABELS[row.paymentMethod]}</caption>
                    <tbody>
                      <tr>
                        <th scope="row" className="text-left font-normal">Vendido</th>
                        <td className="text-right">{formatMoney(row.salesTotal)}</td>
                      </tr>
                      <tr>
                        <th scope="row" className="text-left font-normal">Esperado</th>
                        <td className="text-right">{formatMoney(row.expected)}</td>
                      </tr>
                      {row.counted !== null && (
                        <tr>
                          <th scope="row" className="text-left font-normal">Contado</th>
                          <td className="text-right">{formatMoney(row.counted)}</td>
                        </tr>
                      )}
                      {row.difference !== null && (
                        <tr>
                          <th scope="row" className="pb-3 text-left font-normal">Diferencia</th>
                          <td className="pb-3 text-right font-bold">{formatDifference(moneyToCents(row.difference))}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ))}

                <div className="space-y-1 py-3">
                  <p className="flex justify-between gap-3 font-bold">
                    <span>Total esperado</span>
                    <span>{formatMoney(shift.expectedTotal)}</span>
                  </p>
                  {shift.countedTotal !== null && (
                    <p className="flex justify-between gap-3 font-bold">
                      <span>Total contado</span>
                      <span>{formatMoney(shift.countedTotal)}</span>
                    </p>
                  )}
                  {shift.difference !== null && (
                    <p className="flex justify-between gap-3 text-base">
                      <span className="font-black">Diferencia</span>
                      <CashShiftDifference cents={moneyToCents(shift.difference)} testId="total-difference" />
                    </p>
                  )}
                </div>

                <PrintBrandSignature />
              </article>

              <section aria-label="Acciones del turno" className="mx-auto flex w-full max-w-sm flex-col gap-3 print:hidden">
                {isClosed ? (
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <span className="sr-only">Formato de impresión</span>
                      <select
                        value={printFormat}
                        onChange={(event) => setPrintFormat(event.target.value as PrintFormat)}
                        className={cn(
                          'min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900',
                          CANONICAL_INPUT_CLASSES
                        )}
                      >
                        {PRINT_FORMATS.map((format) => (
                          <option key={format.value} value={format.value}>
                            {format.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={print}
                      className={cn(BUTTON_CLASSES, 'bg-indigo-600 text-white hover:bg-indigo-700', CANONICAL_FOCUS_CLASSES)}
                    >
                      <Printer className="size-4" aria-hidden="true" />
                      Imprimir
                    </button>
                  </div>
                ) : (
                  <Link
                    to={`/ventas/turnos/${shift.id}/cerrar`}
                    className={cn(BUTTON_CLASSES, 'bg-indigo-600 text-white hover:bg-indigo-700', CANONICAL_FOCUS_CLASSES)}
                  >
                    Cerrar turno
                  </Link>
                )}
                <Link to={`/ventas?turno=${shift.id}`} className={cn(BUTTON_CLASSES, SECONDARY_CLASSES, CANONICAL_FOCUS_CLASSES)}>
                  <ReceiptText className="size-4" aria-hidden="true" />
                  Ver las ventas del turno
                </Link>
                <Link to="/ventas/turnos" className={cn(BUTTON_CLASSES, SECONDARY_CLASSES, CANONICAL_FOCUS_CLASSES)}>
                  <History className="size-4" aria-hidden="true" />
                  Ver turnos
                </Link>
              </section>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
