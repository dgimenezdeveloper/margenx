'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, ShieldAlert, Truck } from 'lucide-react'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Navbar } from '@/components/navbar'
import { ToastAlert, type ToastType } from '@/components/ToastAlert'
import { ApiError } from '@/services/api'
import { supplierService, type Supplier, type SupplierSummary } from '@/services/supplierService'
import { SupplierDeleteDialog } from './SupplierDeleteDialog'
import { SupplierFormDialog, type SupplierSaveMode } from './SupplierFormDialog'
import { SuppliersList, SuppliersListSkeleton } from './SuppliersList'

const TOAST_MS = 3500

const sortByName = (suppliers: SupplierSummary[]) =>
  [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

interface Toast {
  id: number
  title: string
  description?: string
  type: ToastType
}

type FormState = { open: false } | { open: true; supplier: SupplierSummary | null }

export default function SuppliersPageContent() {
  const getToken = useTokenGetter()
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [form, setForm] = useState<FormState>({ open: false })
  const [toDelete, setToDelete] = useState<SupplierSummary | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true

    supplierService
      .getAll(getToken)
      .then((result) => {
        if (active) setSuppliers(sortByName(result))
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof ApiError ? error.message : 'No se pudieron cargar los proveedores.')
          setSuppliers([])
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [getToken, reloadKey])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const notify = (title: string, type: ToastType = 'success', description?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), title, description, type })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }

  const retry = () => {
    setIsLoading(true)
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  const summary = useMemo(
    () => ({
      active: suppliers.filter((item) => item.isActive).length,
      ingredients: suppliers.reduce((total, item) => total + item.ingredientCount, 0),
      quarantine: suppliers.reduce((total, item) => total + item.quarantineCount, 0),
    }),
    [suppliers]
  )

  const openCreate = () => setForm({ open: true, supplier: null })

  // La API de alta y edición devuelve el proveedor sin contadores: se conservan los que ya tenía.
  const mergeSaved = (saved: Supplier) => {
    setSuppliers((current) => {
      const previous = current.find((item) => item.id === saved.id)
      const merged: SupplierSummary = {
        ...saved,
        ingredientCount: previous?.ingredientCount ?? 0,
        quarantineCount: previous?.quarantineCount ?? 0,
      }
      return sortByName(previous ? current.map((item) => (item.id === saved.id ? merged : item)) : [...current, merged])
    })
  }

  const handleSaved = (saved: Supplier, mode: SupplierSaveMode) => {
    mergeSaved(saved)
    setForm({ open: false })
    if (mode === 'create') {
      notify(`Proveedor "${saved.name}" creado`, 'success', 'Ya podés vincularlo a tus insumos desde la ficha de cada uno.')
    } else {
      notify(`Cambios guardados en "${saved.name}"`)
    }
  }

  const handleDeleted = (deleted: SupplierSummary) => {
    setSuppliers((current) => current.filter((item) => item.id !== deleted.id))
    setToDelete(null)
    notify(`Diste de baja a "${deleted.name}"`)
  }

  const handleDeactivated = (updated: Supplier) => {
    mergeSaved(updated)
    setToDelete(null)
    notify(`"${updated.name}" quedó inactivo`, 'info', 'Sus presentaciones siguen guardadas, pero sus listas de precios no se aplican.')
  }

  const hasSuppliers = !isLoading && !loadError && suppliers.length > 0

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
          <Navbar />

          <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Proveedores</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                A quién le comprás, cómo contactarlo y qué precios esperan tu decisión.
              </p>
            </div>
            {/* El buscador y los filtros del Sprint 6 van en esta barra, junto al botón de alta. */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-[0.98] md:w-auto"
              >
                <Plus className="size-4" aria-hidden="true" />
                Nuevo proveedor
              </button>
            </div>
          </section>

          {hasSuppliers && (
            <div className="grid grid-cols-3 gap-3 motion-safe:animate-in motion-safe:fade-in">
              <div className="rounded-2xl bg-indigo-50 p-3 md:p-4 dark:bg-indigo-950/60">
                <p className="text-[11px] font-semibold text-indigo-700 md:text-xs dark:text-indigo-300">Proveedores activos</p>
                <p className="mt-1 text-xl font-black text-indigo-950 md:text-2xl dark:text-indigo-100">{summary.active}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 md:p-4 dark:bg-emerald-950/60">
                <p className="text-[11px] font-semibold text-emerald-800 md:text-xs dark:text-emerald-300">Insumos vinculados</p>
                <p className="mt-1 text-xl font-black text-emerald-950 md:text-2xl dark:text-emerald-100">{summary.ingredients}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 md:p-4 dark:bg-amber-950/50">
                <p className="text-[11px] font-semibold text-amber-800 md:text-xs dark:text-amber-300">Precios en cuarentena</p>
                <p className="mt-1 text-xl font-black text-amber-950 md:text-2xl dark:text-amber-100">{summary.quarantine}</p>
              </div>
            </div>
          )}

          {hasSuppliers && summary.quarantine > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-300">
                <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
                {summary.quarantine === 1
                  ? 'Hay 1 precio retenido esperando tu decisión.'
                  : `Hay ${summary.quarantine} precios retenidos esperando tu decisión.`}
              </p>
              <Link
                href="/proveedores/cuarentena"
                className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300"
              >
                Revisar
              </Link>
            </div>
          )}

          <section aria-labelledby="suppliers-heading">
            <h2 id="suppliers-heading" className="sr-only">Listado de proveedores</h2>

            {isLoading && <SuppliersListSkeleton />}

            {!isLoading && loadError && (
              <ErrorState title="Error al cargar proveedores" description={loadError} onRetry={retry} />
            )}

            {!isLoading && !loadError && suppliers.length === 0 && (
              <EmptyState
                icon={<Truck className="size-6" />}
                title="Todavía no cargaste proveedores"
                description="Sumá a quién le comprás para comparar sus precios, recibir sus listas por mail y saber a quién llamar cuando falta algo."
                actionLabel="Cargar mi primer proveedor"
                onAction={openCreate}
              />
            )}

            {hasSuppliers && (
              <SuppliersList
                suppliers={suppliers}
                onEdit={(supplier) => setForm({ open: true, supplier })}
                onDelete={setToDelete}
              />
            )}
          </section>
        </div>
        <DesktopFooter />
      </div>
      <BottomNav />

      <SupplierFormDialog
        open={form.open}
        supplier={form.open ? form.supplier : null}
        onClose={() => setForm({ open: false })}
        onSaved={handleSaved}
      />
      <SupplierDeleteDialog
        open={toDelete !== null}
        supplier={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={handleDeleted}
        onDeactivated={handleDeactivated}
      />
    </main>
  )
}
