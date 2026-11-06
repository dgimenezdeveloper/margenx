'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CircleCheck,
  CirclePause,
  Mail,
  MapPin,
  PackageOpen,
  Phone,
} from 'lucide-react'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Navbar } from '@/components/navbar'
import { ToastAlert, type ToastType } from '@/components/ToastAlert'
import { ApiError } from '@/services/api'
import {
  supplierService,
  type SupplierDetail,
  type SupplierIngredient,
  type SupplierPresentation,
} from '@/services/supplierService'

import { PresentationDeleteDialog } from './components/PresentationDeleteDialog'
import { PresentationEditDialog } from './components/PresentationEditDialog'
import { SupplierPresentationsList } from './components/SupplierPresentationsList'

function SupplierDetailSkeleton() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Cargando detalle del proveedor...</span>
      <div className="h-32 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-64 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
    </div>
  )
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getToken = useTokenGetter()

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [editingPresentation, setEditingPresentation] = useState<SupplierPresentation | null>(null)
  const [deletingPresentation, setDeletingPresentation] = useState<SupplierPresentation | null>(null)

  const [toast, setToast] = useState<{ id: number; title: string; description?: string; type: ToastType } | null>(null)

  const notify = (title: string, type: ToastType = 'success', description?: string) => {
    setToast({ id: Date.now(), title, description, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!id) return
    let active = true

    supplierService
      .getById(getToken, id)
      .then((data) => {
        if (active) setSupplier(data)
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'No se pudieron cargar los datos del proveedor.'
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, getToken, reloadKey])

  const handleRetry = () => {
    setIsLoading(true)
    setLoadError(null)
    setReloadKey((prev) => prev + 1)
  }

  const presentations = useMemo(() => supplier?.ingredients ?? [], [supplier])

  const stats = useMemo(() => {
    return {
      total: presentations.length,
      defaultCount: presentations.filter((p) => p.isDefault).length,
      quarantinedCount: presentations.filter((p) => p.isQuarantined).length,
    }
  }, [presentations])

  const handleSavedPresentation = (updated: SupplierIngredient) => {
    setSupplier((prev) => {
      if (!prev) return prev
      const newIngredients = prev.ingredients.map((item) => {
        if (item.ingredient.id === updated.ingredientId) {
          return {
            ...item,
            packageSize: updated.packageSize,
            packagePrice: updated.packagePrice,
            isDefault: updated.isDefault,
            supplierCode: updated.supplierCode ?? null,
            rawDescription: updated.rawDescription ?? null,
          }
        }
        return item
      })
      return { ...prev, ingredients: newIngredients }
    })
    notify('Presentación actualizada correctamente')
  }

  const handleDeletedPresentation = (deleted: SupplierPresentation) => {
    setSupplier((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        ingredients: prev.ingredients.filter((item) => item.id !== deleted.id),
      }
    })
    notify(`Presentación de "${deleted.ingredient.name}" eliminada`)
  }

  const handleMakeDefault = async (presentation: SupplierPresentation) => {
    if (!supplier) return
    try {
      const result = await supplierService.addPackaging(getToken, supplier.id, {
        ingredientId: presentation.ingredient.id,
        packageSize: Number(presentation.packageSize),
        packageUnit: presentation.packageUnit as 'kg' | 'l' | 'u',
        packagePrice: Number(presentation.packagePrice),
        isDefault: true,
        supplierCode: presentation.supplierCode ?? null,
        rawDescription: presentation.rawDescription ?? null,
      })

      const finalCost =
        typeof result.unitCost === 'number' ? result.unitCost : Number(result.unitCost)

      setSupplier((prev) => {
        if (!prev) return prev
        const newIngredients = prev.ingredients.map((item) =>
          item.id === presentation.id ? { ...item, isDefault: true } : item
        )
        return { ...prev, ingredients: newIngredients }
      })

      notify(
        `Presentación de "${presentation.ingredient.name}" establecida como predeterminada`,
        'success',
        `Costo activo actualizado a $${finalCost.toLocaleString('es-AR')}`
      )
    } catch (error: unknown) {
      notify(
        error instanceof ApiError
          ? error.message
          : 'No se pudo conmutar la presentación predeterminada.',
        'error'
      )
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <ToastAlert
          key={toast.id}
          title={toast.title}
          description={toast.description}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar title="Detalle de proveedor" backHref="/proveedores" />

          {isLoading && <SupplierDetailSkeleton />}

          {!isLoading && loadError && (
            <ErrorState
              title="Error al cargar el proveedor"
              description={loadError}
              onRetry={handleRetry}
            />
          )}

          {!isLoading && !loadError && supplier && (
            <>
              {/* Tarjeta de Información del Proveedor */}
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl dark:text-white">
                        {supplier.name}
                      </h1>
                      {supplier.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <CircleCheck className="size-3.5" aria-hidden="true" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 ring-1 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-300">
                          <CirclePause className="size-3.5" aria-hidden="true" />
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Gestioná sus presentaciones comerciales, códigos SKU y factores de bulto.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {supplier.contactPhone && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        <Phone className="size-3.5 text-gray-400" aria-hidden="true" />
                        {supplier.contactPhone}
                      </span>
                    )}
                    {supplier.email && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        <Mail className="size-3.5 text-gray-400" aria-hidden="true" />
                        {supplier.email}
                      </span>
                    )}
                    {supplier.address && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        <MapPin className="size-3.5 text-gray-400" aria-hidden="true" />
                        {supplier.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                  <div className="rounded-2xl bg-indigo-50/70 p-3 text-center dark:bg-indigo-950/40">
                    <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Presentaciones</p>
                    <p className="text-xl font-black text-indigo-950 dark:text-indigo-100">{stats.total}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/70 p-3 text-center dark:bg-emerald-950/40">
                    <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Predeterminadas</p>
                    <p className="text-xl font-black text-emerald-950 dark:text-emerald-100">{stats.defaultCount}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50/70 p-3 text-center dark:bg-amber-950/40">
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">En cuarentena</p>
                    <p className="text-xl font-black text-amber-950 dark:text-amber-100">{stats.quarantinedCount}</p>
                  </div>
                </div>
              </section>

              {/* Lista de Presentaciones o Estado Vacío */}
              <section aria-labelledby="presentations-heading">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="presentations-heading" className="text-lg font-bold tracking-tight">
                    Presentaciones del proveedor ({presentations.length})
                  </h2>
                </div>

                {presentations.length === 0 ? (
                  <EmptyState
                    icon={<PackageOpen className="size-6" />}
                    title="Sin presentaciones cargadas"
                    description="Este proveedor todavía no tiene insumos ni presentaciones vinculadas. Para asociarlo, abrí la ficha del insumo en Insumos."
                    actionLabel="Ir a Insumos"
                    onAction={() => navigate('/insumos')}
                  />
                ) : (
                  <SupplierPresentationsList
                    presentations={presentations}
                    onEdit={(p) => setEditingPresentation(p)}
                    onDelete={(p) => setDeletingPresentation(p)}
                    onMakeDefault={handleMakeDefault}
                  />
                )}
              </section>
            </>
          )}
        </div>
        <DesktopFooter />
      </div>
      <BottomNav />

      {editingPresentation && supplier && (
        <PresentationEditDialog
          open={editingPresentation !== null}
          supplierId={supplier.id}
          presentation={editingPresentation}
          onClose={() => setEditingPresentation(null)}
          onSaved={handleSavedPresentation}
        />
      )}

      {deletingPresentation && supplier && (
        <PresentationDeleteDialog
          open={deletingPresentation !== null}
          supplierId={supplier.id}
          presentation={deletingPresentation}
          onClose={() => setDeletingPresentation(null)}
          onDeleted={handleDeletedPresentation}
        />
      )}
    </main>
  )
}