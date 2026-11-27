'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Info, ShieldAlert, TrendingUp } from 'lucide-react'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import { useToast } from '@/hooks/useToast'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { ToastAlert } from '@/components/ToastAlert'
import { formatMoney, formatUnit } from '@/lib/format'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { cn } from '@/lib/utils'
import {
  purchasingService,
  type IngredientMarginImpact,
  type MarginImpactResponse,
} from '@/services/purchasingService'
import { supplierService } from '@/services/supplierService'
import { ingredientService } from '@/services/ingredientService'
import { ApiError } from '@/services/api'
import { ProductImpactList } from './components/ProductImpactList'
import { MarginImpactDialog, type MarginImpactDetailState } from './components/MarginImpactDialog'

const PRESENTATION_GONE_MESSAGE =
  'Esa presentación ya no está cargada en el insumo. Actualizá la pantalla e intentá de nuevo.'

function recalculatedMessage(count: number): string {
  return count === 1 ? 'Listo: 1 producto recalculado' : `Listo: ${count} productos recalculados`
}

function quarantineMessage(count: number): string {
  return count === 1
    ? '1 precio en cuarentena no participa del cálculo hasta que lo revises.'
    : `${count} precios en cuarentena no participan del cálculo hasta que los revises.`
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

/**
 * Impacto en el margen (/compras, #446, ADR-010): por cada insumo con un proveedor más barato
 * muestra cuánto mejora el margen de los productos que lo usan. Reemplaza la calculadora de
 * bultos y el pedido semanal, que inventaban cantidades sin stock (RC-16 a RC-19).
 */
export default function PurchasesPage() {
  const navigate = useNavigate()
  const getToken = useTokenGetter()

  const [impact, setImpact] = useState<MarginImpactResponse | null>(null)
  const [quarantinedCount, setQuarantinedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [candidate, setCandidate] = useState<IngredientMarginImpact | null>(null)
  const [detail, setDetail] = useState<MarginImpactDetailState>({ status: 'loading' })
  const [isSaving, setIsSaving] = useState(false)
  // Evita que la respuesta de una confirmación anterior pise la del insumo abierto ahora.
  const detailRequestId = useRef(0)

  const { toast, notify, dismiss: dismissToast } = useToast()

  useEffect(() => {
    let active = true

    Promise.all([
      purchasingService.getMarginImpact(getToken),
      // La cuarentena es un aviso accesorio: si falla, la pantalla igual muestra el impacto.
      supplierService
        .getQuarantine(getToken)
        .then((items) => items.length)
        .catch(() => 0),
    ])
      .then(([data, quarantined]) => {
        if (!active) return
        setImpact(data)
        setQuarantinedCount(quarantined)
      })
      .catch((err: unknown) => {
        if (!active) return
        setLoadError(
          errorMessage(err, 'Revisá tu conexión e intentá de nuevo.')
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [getToken, reloadKey])

  const reloadData = () => {
    setIsLoading(true)
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  const openConfirmation = (item: IngredientMarginImpact) => {
    const requestId = ++detailRequestId.current
    setCandidate(item)
    setDetail({ status: 'loading' })

    purchasingService
      .getIngredientMarginImpact(getToken, item.ingredientId, item.alternativePresentation.supplierIngredientId)
      .then((data) => {
        if (detailRequestId.current === requestId) setDetail({ status: 'ready', data })
      })
      .catch((err: unknown) => {
        if (detailRequestId.current !== requestId) return
        setDetail({
          status: 'error',
          message: errorMessage(err, 'No se pudo calcular el impacto de este cambio. Intentá de nuevo.'),
        })
      })
  }

  const closeConfirmation = () => {
    detailRequestId.current += 1
    setCandidate(null)
  }

  const handleConfirm = async () => {
    if (!candidate || detail.status !== 'ready') return
    const supplierIngredientId = candidate.alternativePresentation.supplierIngredientId
    setIsSaving(true)
    try {
      // margin-impact identifica la presentación por id; el alta con isDefault (el mismo endpoint
      // que Proveedores e Insumos) necesita el proveedor y los datos del bulto, que da la ficha del insumo.
      const ingredient = await ingredientService.getById(getToken, candidate.ingredientId)
      const presentation = ingredient.supplierConnections?.find((conn) => conn.id === supplierIngredientId)
      if (!presentation) {
        notify(PRESENTATION_GONE_MESSAGE, 'error')
        return
      }

      await supplierService.addPackaging(getToken, presentation.supplierId, {
        ingredientId: candidate.ingredientId,
        packageSize: presentation.packageSize,
        packageUnit: presentation.packageUnit as 'kg' | 'l' | 'u',
        packagePrice: presentation.packagePrice,
        isDefault: true,
        // El alta reemplaza el código y la descripción: se reenvían para no perder la ingesta de precios.
        supplierCode: presentation.supplierCode ?? null,
        rawDescription: presentation.rawDescription ?? null,
      })

      notify(recalculatedMessage(detail.data.productsAffectedCount))
      closeConfirmation()
      reloadData()
    } catch (err: unknown) {
      notify(errorMessage(err, 'No se pudo cambiar el proveedor del insumo.'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const items = impact?.byIngredient ?? []

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toast && <ToastAlert key={toast.id} title={toast.title} type={toast.type} onClose={dismissToast} />}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar />

          <header>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-6 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Impacto en el margen</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Insumos que te conviene comprarle a otro proveedor y cuánto mejora el margen de tus productos.
            </p>
          </header>

          {isLoading ? (
            <div role="status" className="space-y-4">
              <span className="sr-only">Calculando el impacto en el margen…</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
            </div>
          ) : loadError ? (
            <ErrorState
              title="No se pudo calcular el impacto en el margen"
              description={loadError}
              onRetry={reloadData}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="size-6" />}
              title="No hay proveedores más baratos para tus insumos"
              description="Cuando cargues un proveedor que venda un insumo más barato que su costo actual, acá vas a ver cuánto mejora el margen de tus productos."
              actionLabel="Ir a Proveedores"
              onAction={() => navigate('/proveedores')}
            />
          ) : (
            <>
              <section aria-labelledby="impact-summary-title" className="space-y-3">
                <h2 id="impact-summary-title" className="sr-only">Resumen del impacto</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Insumos con alternativa</p>
                    <p className="mt-1 text-2xl font-black">{impact?.summary.ingredientsWithAlternative ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Productos que mejoran</p>
                    <p className="mt-1 text-2xl font-black">{impact?.summary.productsAffected ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Salen de En riesgo o Pérdida</p>
                    <p className="mt-1 text-2xl font-black text-emerald-950 dark:text-emerald-100">
                      {impact?.summary.productsLeavingRiskOrLoss ?? 0}
                    </p>
                  </div>
                </div>

                {quarantinedCount > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                      <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <span>{quarantineMessage(quarantinedCount)}</span>
                    </div>
                    <Link
                      to="/proveedores/cuarentena"
                      className={cn(
                        'inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 font-bold text-amber-800 underline hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100',
                        CANONICAL_FOCUS_CLASSES
                      )}
                    >
                      Ver cuarentena
                    </Link>
                  </div>
                )}
              </section>

              <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
                <Info className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <p>
                  Consultar esta pantalla no cambia tus costos ni tus recetas. Cambian solo cuando confirmás que ya le
                  comprás a otro proveedor. Cada tarjeta muestra el efecto de cambiar ese insumo solo.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {items.map((item) => (
                  <IngredientImpactCard key={item.ingredientId} item={item} onConfirm={() => openConfirmation(item)} />
                ))}
              </div>
            </>
          )}
        </div>
        <DesktopFooter />
      </div>

      <BottomNav />

      <MarginImpactDialog
        open={candidate !== null}
        ingredientName={candidate?.ingredientName ?? ''}
        supplierName={candidate?.alternativePresentation.supplierName ?? ''}
        detail={detail}
        isSaving={isSaving}
        onConfirm={() => void handleConfirm()}
        onCancel={closeConfirmation}
      />
    </main>
  )
}

function IngredientImpactCard({ item, onConfirm }: { item: IngredientMarginImpact; onConfirm: () => void }) {
  const unit = formatUnit(item.unit)
  const alternative = item.alternativePresentation

  return (
    <article
      aria-label={item.ingredientName}
      className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <h3 className="text-base font-bold text-gray-900 dark:text-white">{item.ingredientName}</h3>

      {/* Las dos cajas del mismo alto aunque el texto de una ocupe más renglones (#497). */}
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/60">
          <dt className="text-xs font-semibold text-gray-600 dark:text-gray-400">Hoy le comprás a</dt>
          <dd className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100">
            {item.defaultPresentation?.supplierName ?? 'Sin presentación predeterminada'}
          </dd>
          <dd className="text-xs text-gray-600 dark:text-gray-400">
            Costo actual {formatMoney(item.currentCost)} por {unit}
          </dd>
        </div>
        <ArrowRight className="mx-auto hidden size-4 text-gray-400 sm:block sm:self-center" aria-hidden="true" />
        <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
          <dt className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Alternativa más barata</dt>
          <dd className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100">{alternative.supplierName}</dd>
          <dd className="text-xs text-emerald-800 dark:text-emerald-300">
            {formatMoney(alternative.unitCost)} por {unit} · {formatMoney(item.unitCostDifference)} menos por {unit}
          </dd>
        </div>
      </dl>

      {item.products.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400">
            {item.productsAffectedCount === 1
              ? 'Margen del producto que lo usa'
              : `Margen de los ${item.productsAffectedCount} productos que lo usan`}
          </h4>
          <ProductImpactList products={item.products} />
        </div>
      ) : (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Ningún producto con receta usa este insumo: cambiarlo solo actualiza su costo.
        </p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        aria-label={`Ya le compro a este proveedor: ${item.ingredientName} a ${alternative.supplierName}`}
        className={cn(
          'mt-auto min-h-11 w-full cursor-pointer rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700 sm:w-auto sm:self-end',
          CANONICAL_FOCUS_CLASSES
        )}
      >
        Ya le compro a este proveedor
      </button>
    </article>
  )
}
