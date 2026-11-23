'use client'

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, FileDown, LoaderCircle, MessageCircle, Plus, Printer, ReceiptText } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { ToastAlert } from '@/components/ToastAlert'
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
import { useToast } from '@/hooks/useToast'
import { CANONICAL_FOCUS_CLASSES, CANONICAL_INPUT_CLASSES } from '@/lib/accessibility'
import { formatMoney } from '@/lib/format'
import {
  BRAND_TAGLINE,
  NON_FISCAL_LEGEND,
  PAYMENT_METHOD_LABELS,
  TICKET_BRAND_SIGNATURE,
  buildTicketText,
  formatSaleDateTime,
  formatTicketNumber,
  whatsappShareUrl,
} from '@/lib/sales'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { saleService, type Sale } from '@/services/saleService'

type PrintFormat = '58' | '80' | 'A4'

const PRINT_FORMATS: Array<{ value: PrintFormat; label: string }> = [
  { value: '58', label: 'Ticketera 58 mm' },
  { value: '80', label: 'Ticketera 80 mm' },
  { value: 'A4', label: 'Hoja A4' },
]

/**
 * Tamaño de página y ancho del ticket impreso para cada formato. En la ticketera el logo
 * sale en negro puro (la impresora térmica no tiene color y el violeta saldría gris) y sin
 * el lema, para ahorrar papel. En A4 y en el PDF, el logo va en color y con el lema.
 * El `!important` gana sobre el logo invertido del modo oscuro.
 */
const THERMAL_BRAND_CSS = '.mx-ticket-logo { filter: grayscale(1) brightness(0) !important; } .mx-ticket-tagline { display: none; }'

const PRINT_CSS: Record<PrintFormat, string> = {
  '58': `@page { size: 58mm auto; margin: 2mm; } .mx-ticket { width: 54mm; font-size: 11px; } .mx-ticket-logo { width: 34mm; } ${THERMAL_BRAND_CSS}`,
  '80': `@page { size: 80mm auto; margin: 3mm; } .mx-ticket { width: 74mm; font-size: 12px; } .mx-ticket-logo { width: 44mm; } ${THERMAL_BRAND_CSS}`,
  A4: '@page { size: A4; margin: 15mm; } .mx-ticket { width: 100mm; font-size: 13px; } .mx-ticket-logo { width: 56mm; filter: none !important; }',
}

const BUTTON_CLASSES =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Ticket no fiscal de una venta (ADR-010): comercio, fecha y hora, número, ítems, total,
 * medio de pago y la leyenda "Comprobante no válido como factura". Se imprime en una
 * ticketera de 58/80 mm o en A4, se guarda como PDF y se comparte por WhatsApp.
 */
export default function SaleTicketPage() {
  const { id = '' } = useParams()
  // Una venta nueva abre otro ticket en la misma ruta: la clave reinicia la carga.
  return <SaleTicket key={id} id={id} />
}

function SaleTicket({ id }: { id: string }) {
  const getToken = useTokenGetter()
  const { toast, notify, dismiss } = useToast()

  const [sale, setSale] = useState<Sale | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<'not-found' | 'failed' | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [printFormat, setPrintFormat] = useState<PrintFormat>('80')
  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [voidError, setVoidError] = useState<string | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)

  useEffect(() => {
    let cancelled = false
    saleService
      .getById(getToken, id)
      .then((data) => {
        if (!cancelled) setSale(data)
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

  const printAs = (format: PrintFormat) => {
    setPrintFormat(format)
    // El navegador toma el CSS de impresión del formato elegido en el próximo cuadro.
    window.requestAnimationFrame(() => window.print())
  }

  const handleVoid = async () => {
    if (!sale || isVoiding) return
    setIsVoiding(true)
    setVoidError(null)
    try {
      const updated = await saleService.void(getToken, sale.id, voidReason.trim())
      setSale(updated)
      setShowVoidDialog(false)
      setVoidReason('')
      notify('Venta anulada. Queda en el historial con el motivo.', 'success')
    } catch (err) {
      setVoidError(err instanceof ApiError ? err.message : 'No se pudo anular la venta. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setIsVoiding(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 print:min-h-0 print:bg-white print:text-black">
      <style>{`@media print { ${PRINT_CSS[printFormat]} }`}</style>
      {toast && (
        <div className="print:hidden">
          <ToastAlert key={toast.id} title={toast.title} type={toast.type} onClose={dismiss} />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-3xl md:px-8 print:m-0 print:max-w-none print:p-0">
        <div className="flex flex-col gap-5 pb-28 md:pb-12 print:gap-0 print:pb-0">
          <div className="print:hidden">
            <Navbar title="Ticket" backHref="/ventas" />
          </div>

          {isLoading ? (
            <div className="mx-auto h-96 w-full max-w-sm animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" aria-label="Cargando ticket" />
          ) : error === 'not-found' ? (
            <EmptyState
              icon={<ReceiptText className="size-6" />}
              title="La venta no existe"
              description="Puede que el enlace esté mal o que la venta sea de otra persona."
            />
          ) : error || !sale ? (
            <ErrorState
              title="No pudimos cargar el ticket"
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
                aria-label={`Ticket ${formatTicketNumber(sale.ticketNumber)}`}
                className="mx-ticket mx-auto w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 font-mono text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none"
              >
                <header className="border-b border-dashed border-gray-300 pb-3 text-center dark:border-gray-600 print:border-black">
                  <img
                    src="/logo.png"
                    alt="MargenX"
                    width={644}
                    height={249}
                    className="mx-ticket-logo mx-auto h-auto w-40 dark:brightness-0 dark:invert"
                  />
                  <p className="mx-ticket-tagline mb-3 font-sans text-[11px] text-gray-500 dark:text-gray-400 print:text-black">
                    {BRAND_TAGLINE}
                  </p>
                  <p className="text-base font-black">{sale.businessName}</p>
                  <p>Ticket {formatTicketNumber(sale.ticketNumber)}</p>
                  <p>{formatSaleDateTime(sale.soldAt)}</p>
                </header>

                {sale.status === 'VOIDED' && (
                  <p className="mt-3 rounded-lg border border-rose-300 px-2 py-1 text-center font-bold text-rose-800 dark:border-rose-700 dark:text-rose-200 print:border-black print:text-black">
                    VENTA ANULADA{sale.voidReason ? ` · ${sale.voidReason}` : ''}
                  </p>
                )}

                <ul className="space-y-1.5 border-b border-dashed border-gray-300 py-3 dark:border-gray-600 print:border-black">
                  {sale.items.map((item) => (
                    <li key={`${item.productId ?? item.productName}`} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        {item.quantity} × {item.productName}
                        <span className="block text-xs text-gray-500 dark:text-gray-400 print:text-black">
                          {formatMoney(item.unitPrice)} c/u
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">{formatMoney(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1 py-3">
                  <p className="flex justify-between text-base font-black">
                    <span>Total</span>
                    <span data-testid="ticket-total">{formatMoney(sale.total)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Pago</span>
                    <span>{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</span>
                  </p>
                </div>

                <p className="border-t border-dashed border-gray-300 pt-3 text-center text-xs font-bold uppercase dark:border-gray-600 print:border-black">
                  {NON_FISCAL_LEGEND}
                </p>
                <p className="mt-2 text-center text-[11px] text-gray-500 dark:text-gray-400 print:text-black">{TICKET_BRAND_SIGNATURE}</p>
              </article>

              <section aria-label="Acciones del ticket" className="mx-auto flex w-full max-w-sm flex-col gap-3 print:hidden">
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
                    onClick={() => printAs(printFormat)}
                    className={cn(BUTTON_CLASSES, 'bg-indigo-600 text-white hover:bg-indigo-700', CANONICAL_FOCUS_CLASSES)}
                  >
                    <Printer className="size-4" aria-hidden="true" />
                    Imprimir
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => printAs('A4')}
                  className={cn(
                    BUTTON_CLASSES,
                    'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                    CANONICAL_FOCUS_CLASSES
                  )}
                >
                  <FileDown className="size-4" aria-hidden="true" />
                  Descargar PDF
                </button>
                <p className="-mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
                  En la ventana de impresión, elegí "Guardar como PDF".
                </p>

                <a
                  href={whatsappShareUrl(buildTicketText(sale))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(BUTTON_CLASSES, 'bg-emerald-700 text-white hover:bg-emerald-800', CANONICAL_FOCUS_CLASSES)}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Compartir por WhatsApp
                </a>

                <Link
                  to="/ventas/nueva"
                  className={cn(
                    BUTTON_CLASSES,
                    'border border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950',
                    CANONICAL_FOCUS_CLASSES
                  )}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Nueva venta
                </Link>

                {sale.status === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoidError(null)
                      setShowVoidDialog(true)
                    }}
                    className={cn(BUTTON_CLASSES, 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40', CANONICAL_FOCUS_CLASSES)}
                  >
                    <Ban className="size-4" aria-hidden="true" />
                    Anular venta
                  </button>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={showVoidDialog}
        onOpenChange={(open) => {
          if (!open && !isVoiding) setShowVoidDialog(false)
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>¿Anular la venta?</DialogTitle>
            <DialogDescription>
              La venta no se borra: queda en el historial como anulada, con el motivo que escribas.
            </DialogDescription>
            <label className="mt-4 block text-sm font-semibold">
              Motivo
              <textarea
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Por ejemplo: cobré dos veces la misma venta"
                className={cn(
                  'mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm font-normal dark:border-gray-700 dark:bg-gray-900',
                  CANONICAL_INPUT_CLASSES
                )}
              />
            </label>
            {voidError && (
              <p role="alert" className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {voidError}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <DialogClose
                disabled={isVoiding}
                className={cn(
                  'min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                Volver
              </DialogClose>
              <button
                type="button"
                onClick={handleVoid}
                disabled={isVoiding || voidReason.trim().length < 3}
                className={cn(
                  'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-700 py-3 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                {isVoiding ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : 'Anular'}
              </button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      <BottomNav />
    </main>
  )
}
