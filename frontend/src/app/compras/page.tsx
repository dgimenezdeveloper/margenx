'use client'

import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Building2,
  Check,
  Copy,
  Info,
  LoaderCircle,
  Printer,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  TrendingDown,
} from 'lucide-react'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
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
import { NumericInput } from '@/components/NumericInput'
import { formatMoney, formatPercent } from '@/lib/format'
import { formatPackage } from '@/lib/supplierDisplay'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { cn } from '@/lib/utils'
import {
  purchasingService,
  type OrderPreviewResponse,
  type PurchasingSuggestionsResponse,
  type SupplierSuggestionItem,
} from '@/services/purchasingService'
import { supplierService } from '@/services/supplierService'
import { ApiError } from '@/services/api'

interface DefaultCandidate {
  item: SupplierSuggestionItem
  supplierId: string
  supplierName: string
}

function buildOrderClipboardText(preview: OrderPreviewResponse): string {
  const lines: string[] = []
  lines.push('📋 *ORDEN DE COMPRA SUGERIDA — MARGENX*')
  lines.push(`Total estimado: ${formatMoney(preview.total)} (Ahorro calculado: ${formatMoney(preview.totalSavings)})\n`)

  for (const group of preview.groups) {
    lines.push(`🏢 *Proveedor: ${group.supplierName}*`)
    if (group.contactPhone) lines.push(`📞 Tel: ${group.contactPhone}`)
    if (group.email) lines.push(`✉️ Email: ${group.email}`)
    lines.push('Ítems solicitados:')
    for (const item of group.items) {
      const sku = item.supplierCode ? ` [SKU: ${item.supplierCode}]` : ''
      lines.push(
        `• ${item.ingredientName}${sku}: ${item.packages} bulto(s) de ${item.packageSize} ${item.packageUnit} (${formatMoney(item.packagePrice)} c/u) = ${formatMoney(item.subtotal)}`
      )
    }
    lines.push(`Subtotal proveedor: ${formatMoney(group.subtotal)}\n`)
  }
  return lines.join('\n')
}

export default function PurchasesPage() {
  const navigate = useNavigate()
  const getToken = useTokenGetter()

  const [suggestions, setSuggestions] = useState<PurchasingSuggestionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Cantidad de bultos por presentación sugerida
  const [packageQuantities, setPackageQuantities] = useState<Record<string, number>>({})

  // Estado del cálculo del pedido
  const [isCalculatingOrder, setIsCalculatingOrder] = useState(false)
  const [orderPreview, setOrderPreview] = useState<OrderPreviewResponse | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  // Modal para confirmar "Hacer predeterminada" con datos del proveedor sugerido
  const [defaultCandidate, setDefaultCandidate] = useState<DefaultCandidate | null>(null)
  const [isSettingDefault, setIsSettingDefault] = useState(false)

  // Notificaciones Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    let active = true

    purchasingService
      .getSuggestions(getToken)
      .then((data) => {
        if (!active) return
        setSuggestions(data)
        const initialQtys: Record<string, number> = {}
        for (const group of data.bySupplier) {
          for (const item of group.items) {
            initialQtys[item.supplierIngredientId] = 1
          }
        }
        setPackageQuantities(initialQtys)
      })
      .catch((err: unknown) => {
        if (!active) return
        setLoadError(
          err instanceof ApiError
            ? err.message
            : 'No se pudieron cargar las sugerencias de compra. Revisá tu conexión e intentá nuevamente.'
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [getToken, reloadKey])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const reloadData = () => {
    setIsLoading(true)
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  const handleQuantityChange = (supplierIngredientId: string, val: string) => {
    const intVal = parseInt(val, 10)
    setPackageQuantities((prev) => ({
      ...prev,
      [supplierIngredientId]: isNaN(intVal) || intVal < 0 ? 0 : intVal,
    }))
  }

  const handleCalculateOrder = async () => {
    if (!suggestions) return
    setOrderError(null)

    const itemsToOrder = Object.entries(packageQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([supplierIngredientId, packages]) => ({
        supplierIngredientId,
        packages,
      }))

    if (itemsToOrder.length === 0) {
      setOrderError('Ingresá al menos 1 bulto en los insumos que deseás incluir en el pedido.')
      return
    }

    if (itemsToOrder.some((i) => i.packages > 100000)) {
      setOrderError('El campo "bultos" no puede superar los 100.000 bultos por ítem.')
      return
    }

    setIsCalculatingOrder(true)
    try {
      const preview = await purchasingService.previewOrder(getToken, itemsToOrder)
      setOrderPreview(preview)
      notify('Pedido sugerido calculado exitosamente.')
    } catch (err: unknown) {
      setOrderError(
        err instanceof ApiError
          ? err.message
          : 'Ocurrió un error al calcular la previsualización del pedido.'
      )
    } finally {
      setIsCalculatingOrder(false)
    }
  }

  const handleCopyOrder = async () => {
    if (!orderPreview) return
    try {
      const text = buildOrderClipboardText(orderPreview)
      await navigator.clipboard.writeText(text)
      notify('Pedido copiado al portapapeles listo para enviar por WhatsApp o email.')
    } catch {
      notify('No se pudo copiar automáticamente. Por favor seleccioná el texto de la orden.', 'error')
    }
  }

  const handlePrintOrder = () => {
    window.print()
  }

  const handleConfirmMakeDefault = async () => {
    if (!defaultCandidate) return
    setIsSettingDefault(true)
    try {
      await supplierService.addPackaging(getToken, defaultCandidate.supplierId, {
        ingredientId: defaultCandidate.item.ingredientId,
        packageSize: Number(defaultCandidate.item.packageSize),
        packageUnit: defaultCandidate.item.packageUnit as 'kg' | 'l' | 'u',
        packagePrice: Number(defaultCandidate.item.packagePrice),
        isDefault: true,
        supplierCode: defaultCandidate.item.supplierCode,
        rawDescription: defaultCandidate.item.rawDescription,
      })

      notify(
        `Presentación de "${defaultCandidate.item.ingredientName}" establecida como predeterminada. Costos y recetas actualizados.`
      )
      setDefaultCandidate(null)
      reloadData()
    } catch (err: unknown) {
      notify(
        err instanceof ApiError
          ? err.message
          : 'No se pudo establecer como proveedor predeterminado.',
        'error'
      )
    } finally {
      setIsSettingDefault(false)
    }
  }

  const hasSavings = (suggestions?.summary.withSavingsCount ?? 0) > 0
  const isCompletelyEmpty =
    !isLoading &&
    !loadError &&
    (suggestions?.summary.withSavingsCount ?? 0) === 0 &&
    (suggestions?.summary.alreadyBestPriceCount ?? 0) === 0 &&
    (suggestions?.summary.singleSupplierCount ?? 0) === 0

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <div className="print:hidden">
          <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12 print:pb-0">
          <div className="print:hidden">
            <Navbar />
          </div>

          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Compras Sugeridas</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Optimización de costos y armado eficiente de pedidos según el mejor precio disponible.
              </p>
            </div>
          </header>

          {isLoading ? (
            <div role="status" className="space-y-4">
              <span className="sr-only">Cargando sugerencias de compras...</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
            </div>
          ) : loadError ? (
            <ErrorState
              title="Error al cargar sugerencias de compra"
              description={loadError}
              onRetry={reloadData}
            />
          ) : isCompletelyEmpty ? (
            <EmptyState
              icon={<ShoppingCart className="size-6" />}
              title="No hay comparativas de compra disponibles"
              description="Para comparar precios y optimizar tus compras, cargá presentaciones de más de un proveedor para tus insumos."
              actionLabel="Ir a Proveedores"
              onAction={() => navigate('/proveedores')}
            />
          ) : (
            <>
              {/* Tarjetas de Resumen KPI */}
              <section aria-labelledby="summary-kpis-title" className="print:hidden space-y-3">
                <h2 id="summary-kpis-title" className="sr-only">Resumen de Compras</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Con Ahorro Disponible</p>
                    <p className="mt-1 text-2xl font-black text-emerald-950 dark:text-emerald-100">
                      {suggestions?.summary.withSavingsCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Al Mejor Precio</p>
                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-gray-100">
                      {suggestions?.summary.alreadyBestPriceCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Proveedor Único</p>
                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-gray-100">
                      {suggestions?.summary.singleSupplierCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Excluidos (Cuarentena)</p>
                    <p className="mt-1 text-2xl font-black text-amber-950 dark:text-amber-100">
                      {suggestions?.summary.quarantinedExcludedCount ?? 0}
                    </p>
                  </div>
                </div>

                {(suggestions?.summary.quarantinedExcludedCount ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                      <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Hay <strong>{suggestions?.summary.quarantinedExcludedCount}</strong> presentación(es) retenida(s) en cuarentena que no participan de las sugerencias hasta ser liberadas.
                      </span>
                    </div>
                    <Link
                      to="/proveedores/cuarentena"
                      className={cn(
                        'min-h-11 inline-flex items-center font-bold text-amber-800 underline dark:text-amber-300 hover:text-amber-950 shrink-0 px-2 rounded-lg',
                        CANONICAL_FOCUS_CLASSES
                      )}
                    >
                      Ver Cuarentena
                    </Link>
                  </div>
                )}
              </section>

              {/* Banner Aclaratorio de Dominio */}
              <div className="flex items-start gap-2.5 rounded-2xl bg-indigo-50/70 p-3.5 text-xs text-indigo-950 border border-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200 print:hidden">
                <Info className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <p>
                  <strong>Importante:</strong> Las sugerencias identifican la opción más económica entre tus distribuidores. Consultar esta pantalla <strong>no modifica tus costos vigentes ni tus recetas</strong> salvo que conmutes expresamente el proveedor predeterminado.
                </p>
              </div>

              {!hasSavings ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900 print:border-none">
                  <Sparkles className="mx-auto size-8 text-indigo-500 mb-2" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    ¡Todos tus insumos están al costo óptimo!
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    No se detectaron proveedores más económicos que tu presentación predeterminada actual.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Lista de Grupos por Proveedor */}
                  {suggestions?.bySupplier.map((group) => (
                    <section
                      key={group.supplierId}
                      className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4 print:border-none print:shadow-none"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                              {group.supplierName}
                            </h3>
                          </div>
                          {(group.contactPhone || group.email) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {[group.contactPhone, group.email].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <TrendingDown className="size-3.5" /> Ahorro potencial por bulto: {formatMoney(group.totalPackageSavings)}
                          </span>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {group.items.map((item) => (
                          <article
                            key={item.supplierIngredientId}
                            className="py-3.5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {item.ingredientName}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <span>Bulto: {formatPackage(item.packageSize, item.packageUnit)} @ {formatMoney(item.packagePrice)}</span>
                                {item.supplierCode && (
                                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] dark:bg-gray-800">
                                    SKU: {item.supplierCode}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs mt-1 text-indigo-900 dark:text-indigo-200">
                                Sugerido: <strong>{formatMoney(item.unitCost)}/{item.unit}</strong> vs actual <strong>{formatMoney(item.defaultUnitCost)}/{item.unit}</strong> ({item.defaultSupplierName})
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 md:justify-end shrink-0">
                              <div className="text-right">
                                <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                  -{formatMoney(item.savingsPerUnit)}/{item.unit} ({formatPercent(item.savingsPercent)})
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  Ahorro bulto: {formatMoney(item.packageSavings)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setDefaultCandidate({
                                    item,
                                    supplierId: group.supplierId,
                                    supplierName: group.supplierName,
                                  })
                                }
                                className={cn(
                                  'min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer',
                                  CANONICAL_FOCUS_CLASSES
                                )}
                              >
                                Hacer predeterminada
                              </button>

                              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                                <label
                                  htmlFor={`qty-${item.supplierIngredientId}`}
                                  className="text-[11px] font-bold text-gray-500 dark:text-gray-400"
                                >
                                  Bultos:
                                </label>
                                <NumericInput
                                  id={`qty-${item.supplierIngredientId}`}
                                  aria-label={`Bultos de ${item.ingredientName}`}
                                  value={packageQuantities[item.supplierIngredientId] ?? 1}
                                  onChange={(val) => handleQuantityChange(item.supplierIngredientId, val)}
                                  containerClassName="w-16 border-none bg-transparent px-0 focus-within:ring-0"
                                  className="text-right text-sm font-black text-gray-900 dark:text-white"
                                  maxDecimals={0}
                                />
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}

                  {/* Botón de Cálculo de Pedido */}
                  <div className="flex justify-end pt-2 print:hidden">
                    <button
                      type="button"
                      onClick={handleCalculateOrder}
                      disabled={isCalculatingOrder}
                      className={cn(
                        'min-h-12 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer',
                        CANONICAL_FOCUS_CLASSES
                      )}
                    >
                      {isCalculatingOrder ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="size-4" />
                      )}
                      Calcular pedido sugerido
                    </button>
                  </div>
                </div>
              )}

              {/* Vista Previa de la Orden de Compra */}
              {orderError && (
                <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <p>{orderError}</p>
                </div>
              )}

              {orderPreview && (
                <section
                  id="order-preview-section"
                  aria-labelledby="order-preview-title"
                  className="rounded-3xl border-2 border-indigo-200 bg-white p-6 shadow-md dark:border-indigo-900/60 dark:bg-gray-900 space-y-6 print:border-none print:shadow-none print:p-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                    <div>
                      <h2 id="order-preview-title" className="text-lg font-bold text-gray-900 dark:text-white">
                        Previsualización del Pedido Semanal
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {orderPreview.itemsCount} producto(s) · {orderPreview.totalPackages} bultos totales
                      </p>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={handleCopyOrder}
                        className={cn(
                          'min-h-11 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer shadow-xs',
                          CANONICAL_FOCUS_CLASSES
                        )}
                      >
                        <Copy className="size-4 text-indigo-600 dark:text-indigo-400" /> Copiar pedido
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintOrder}
                        className={cn(
                          'min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 cursor-pointer shadow-xs',
                          CANONICAL_FOCUS_CLASSES
                        )}
                      >
                        <Printer className="size-4" /> Imprimir
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 rounded-2xl bg-indigo-50/60 p-4 dark:bg-indigo-950/40">
                    <div>
                      <span className="block text-xs font-bold text-gray-500 dark:text-gray-400">Total Estimado</span>
                      <span className="text-2xl font-black text-gray-900 dark:text-white">
                        {formatMoney(orderPreview.total)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-400">Ahorro Neto Estimado</span>
                      <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                        {formatMoney(orderPreview.totalSavings)}
                      </span>
                    </div>
                  </div>

                  {/* Desglose por Proveedor */}
                  <div className="space-y-4">
                    {orderPreview.groups.map((group) => (
                      <div
                        key={group.supplierId}
                        className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                              {group.supplierName}
                            </h3>
                            {group.contactPhone && (
                              <p className="text-xs text-gray-500">{group.contactPhone}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-900 dark:text-white block">
                              Subtotal: {formatMoney(group.subtotal)}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                              Ahorro: {formatMoney(group.savings)}
                            </span>
                          </div>
                        </div>

                        <ul className="text-xs space-y-1.5 border-t border-gray-200/60 pt-2 dark:border-gray-700/60">
                          {group.items.map((line) => (
                            <li key={line.supplierIngredientId} className="flex justify-between items-baseline">
                              <span>
                                • <strong>{line.ingredientName}</strong> {line.supplierCode ? `[${line.supplierCode}]` : ''}: {line.packages} bulto(s) ({line.totalQuantity} {line.unit})
                              </span>
                              <span className="font-semibold">{formatMoney(line.subtotal)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
        <div className="print:hidden">
          <DesktopFooter />
        </div>
      </div>

      <div className="print:hidden">
        <BottomNav />
      </div>

      {/* Modal de Confirmación "Hacer Predeterminada" */}
      <Dialog
        open={defaultCandidate !== null}
        onOpenChange={(open) => {
          if (!open && !isSettingDefault) setDefaultCandidate(null)
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <Check className="size-7" />
            </div>
            <DialogTitle>¿Cambiar proveedor predeterminado?</DialogTitle>
            <DialogDescription>
              Estás a punto de establecer a <strong>{defaultCandidate?.supplierName}</strong> como el proveedor predeterminado para <strong>{defaultCandidate?.item.ingredientName}</strong> (reemplazando a {defaultCandidate?.item.defaultSupplierName}). El costo activo pasará a ser {defaultCandidate ? formatMoney(defaultCandidate.item.unitCost) : '$0,00'} y se recalcularán todas las recetas asociadas.
            </DialogDescription>
            <div className="mt-6 flex gap-3">
              <DialogClose
                disabled={isSettingDefault}
                className={cn(
                  'min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                Cancelar
              </DialogClose>
              <button
                type="button"
                disabled={isSettingDefault}
                onClick={handleConfirmMakeDefault}
                className={cn(
                  'min-h-11 flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                {isSettingDefault ? <LoaderCircle className="size-4 animate-spin" /> : 'Confirmar cambio'}
              </button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </main>
  )
}