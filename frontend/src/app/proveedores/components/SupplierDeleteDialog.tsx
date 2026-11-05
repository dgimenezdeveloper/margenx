import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { AlertTriangle, CirclePause, Info, LoaderCircle, PackageOpen, RefreshCw, Star, ShieldAlert, Trash2 } from 'lucide-react'

import { Dialog, DialogBackdrop, DialogClose, DialogDescription, DialogPopup, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { formatPackage, formatPackagePrice } from '@/lib/supplierDisplay'
import { ApiError } from '@/services/api'
import { supplierService, type Supplier, type SupplierPresentation, type SupplierSummary } from '@/services/supplierService'

interface SupplierDeleteDialogProps {
  open: boolean
  supplier: SupplierSummary | null
  onClose: () => void
  onDeleted: (supplier: SupplierSummary) => void
  onDeactivated: (supplier: Supplier) => void
}

type DetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; presentations: SupplierPresentation[] }

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`

const errorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback)

function PresentationsSkeleton() {
  return (
    <div role="status" className="mt-5 space-y-2">
      <span className="sr-only">Buscando las presentaciones afectadas...</span>
      {[0, 1, 2].map((row) => (
        <div key={row} aria-hidden="true" className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-3 dark:border-gray-800">
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  )
}

function ImpactNotes({ presentations }: { presentations: SupplierPresentation[] }) {
  const defaults = presentations.filter((item) => item.isDefault).map((item) => item.ingredient.name)
  const quarantined = presentations.filter((item) => item.isQuarantined).length

  return (
    <ul className="mt-4 space-y-2 text-xs text-gray-700 dark:text-gray-300">
      {defaults.length > 0 && (
        <li className="flex items-start gap-2 rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/40">
          <Star className="mt-0.5 size-3.5 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          <span>
            {defaults.length === 1
              ? `${defaults[0]} conserva su costo actual, pero queda sin proveedor predeterminado hasta que elijas otro.`
              : `${joinNames(defaults)} conservan su costo actual, pero quedan sin proveedor predeterminado hasta que elijas otro.`}
          </span>
        </li>
      )}
      {quarantined > 0 && (
        <li className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          <span>
            {quarantined === 1
              ? '1 precio en cuarentena se descarta sin aplicarse.'
              : `${quarantined} precios en cuarentena se descartan sin aplicarse.`}
          </span>
        </li>
      )}
      <li className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
        <Info className="mt-0.5 size-3.5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
        <span>Las listas de precios de este proveedor ya no van a actualizar estos insumos.</span>
      </li>
    </ul>
  )
}

/**
 * Confirmación de baja de un proveedor. Antes de habilitar el botón trae `GET /api/suppliers/:id`
 * y lista cada presentación que se borra en cascada (especificación funcional §4), para que el
 * administrador vea qué insumos pierden a este proveedor. Ofrece desactivarlo como alternativa.
 */
export function SupplierDeleteDialog({ open, supplier, onClose, onDeleted, onDeactivated }: SupplierDeleteDialogProps) {
  const { getToken } = useAuth()
  const [detail, setDetail] = useState<DetailState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [pendingAction, setPendingAction] = useState<'delete' | 'deactivate' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const supplierId = supplier?.id

  useEffect(() => {
    if (!open || !supplierId) return
    let active = true
    setDetail({ status: 'loading' })
    setActionError(null)

    supplierService
      .getById(getToken, supplierId)
      .then((result) => {
        if (active) setDetail({ status: 'ready', presentations: result.ingredients ?? [] })
      })
      .catch(() => {
        if (active) setDetail({ status: 'error' })
      })

    return () => {
      active = false
    }
  }, [open, supplierId, getToken, reloadKey])

  const retry = useCallback(() => setReloadKey((key) => key + 1), [])

  if (!supplier) return null

  const isBusy = pendingAction !== null
  const presentations = detail.status === 'ready' ? detail.presentations : []

  const handleDelete = async () => {
    setPendingAction('delete')
    setActionError(null)
    try {
      await supplierService.remove(getToken, supplier.id)
      onDeleted(supplier)
    } catch (error: unknown) {
      setActionError(errorMessage(error, 'No pudimos dar de baja al proveedor. Revisá tu conexión y volvé a intentar.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleDeactivate = async () => {
    setPendingAction('deactivate')
    setActionError(null)
    try {
      const updated = await supplierService.update(getToken, supplier.id, { isActive: false })
      onDeactivated(updated)
    } catch (error: unknown) {
      setActionError(errorMessage(error, 'No pudimos desactivar al proveedor. Revisá tu conexión y volvé a intentar.'))
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isBusy) onClose() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto text-left md:max-w-lg">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg leading-snug">¿Dar de baja a {supplier.name}?</DialogTitle>
              <DialogDescription className="mt-1">
                Se borra el proveedor junto con sus presentaciones. Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </div>

          {detail.status === 'loading' && <PresentationsSkeleton />}

          {detail.status === 'error' && (
            <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <p className="font-bold">No pudimos traer las presentaciones de este proveedor.</p>
              <p className="mt-1 text-xs">Para darlo de baja necesitás ver primero qué insumos se ven afectados.</p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-700 active:scale-95"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          )}

          {detail.status === 'ready' && presentations.length === 0 && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 motion-safe:animate-in motion-safe:fade-in dark:border-gray-700 dark:text-gray-400">
              <PackageOpen className="size-5 shrink-0" aria-hidden="true" />
              <p>No tiene presentaciones cargadas: ningún insumo se ve afectado.</p>
            </div>
          )}

          {detail.status === 'ready' && presentations.length > 0 && (
            <div className="mt-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1">
              <h3 id="affected-presentations" className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Presentaciones afectadas ({presentations.length})
              </h3>
              <ul aria-labelledby="affected-presentations" className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                {presentations.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{item.ingredient.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatPackage(item.packageSize, item.packageUnit)} · {formatPackagePrice(item.packagePrice)}
                      </p>
                      {item.supplierCode && (
                        <p className="mt-0.5 font-mono text-[11px] text-gray-500 dark:text-gray-400">Cód. {item.supplierCode}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {item.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          <Star className="size-3" aria-hidden="true" />
                          Predeterminada
                        </span>
                      )}
                      {item.isQuarantined && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          <ShieldAlert className="size-3" aria-hidden="true" />
                          En cuarentena
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <ImpactNotes presentations={presentations} />
            </div>
          )}

          {actionError && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 motion-safe:animate-in motion-safe:fade-in dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{actionError}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row">
            <DialogClose
              disabled={isBusy}
              className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </DialogClose>
            <button
              type="button"
              onClick={handleDelete}
              disabled={detail.status !== 'ready' || isBusy}
              className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === 'delete' ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              {pendingAction === 'delete' ? 'Dando de baja...' : 'Sí, dar de baja'}
            </button>
          </div>

          {supplier.isActive && detail.status === 'ready' && presentations.length > 0 && (
            <p className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
              ¿Quizás le vuelvas a comprar?{' '}
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isBusy}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-800 disabled:opacity-50 dark:text-indigo-300"
              >
                {pendingAction === 'deactivate' ? (
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CirclePause className="size-3.5" aria-hidden="true" />
                )}
                Desactivar en su lugar
              </button>{' '}
              y conservá sus presentaciones.
            </p>
          )}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
