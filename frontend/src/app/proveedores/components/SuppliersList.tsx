import { useId } from 'react'
import Link from 'next/link'
import { CircleCheck, CirclePause, Pencil, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'

import { supplierContact } from '@/lib/supplierDisplay'
import type { SupplierSummary } from '@/services/supplierService'

interface SuppliersListProps {
  suppliers: SupplierSummary[]
  onEdit: (supplier: SupplierSummary) => void
  onDelete: (supplier: SupplierSummary) => void
}

const QUARANTINE_HINT =
  'Precios de este proveedor retenidos porque cambiaron demasiado. Esperan que los apruebes o rechaces en Cuarentena.'

// Columnas compartidas por el encabezado y cada fila desde `md`.
const DESKTOP_GRID = 'md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_7rem_minmax(0,1.1fr)_auto] md:items-center md:gap-4'

const pluralInsumos = (count: number) => `${count} ${count === 1 ? 'insumo' : 'insumos'}`

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-950/50 dark:text-emerald-300">
      <CircleCheck className="size-3" aria-hidden="true" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600 ring-1 ring-gray-500/20 ring-inset dark:bg-gray-800 dark:text-gray-300">
      <CirclePause className="size-3" aria-hidden="true" />
      Inactivo
    </span>
  )
}

function QuarantineBadge({ count }: { count: number }) {
  const tooltipId = useId()

  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Sin precios retenidos
      </span>
    )
  }

  return (
    <span className="group relative inline-flex">
      <Link
        href="/proveedores/cuarentena"
        aria-describedby={tooltipId}
        className="inline-flex min-h-8 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-600/30 ring-inset transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
      >
        <ShieldAlert className="size-3.5" aria-hidden="true" />
        {count} en cuarentena
      </Link>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 translate-y-1 rounded-xl bg-gray-900 px-3 py-2 text-center text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:bg-gray-700"
      >
        {QUARANTINE_HINT}
      </span>
    </span>
  )
}

/**
 * Lista responsiva de proveedores: tarjetas apiladas en el celular y filas tipo tabla desde `md`.
 * Es una sola lista en el DOM (no una tabla y unas tarjetas duplicadas), así el lector de pantalla
 * la recorre una vez. Recibe los proveedores ya filtrados: el buscador del Sprint 6 se monta arriba.
 */
export function SuppliersList({ suppliers, onEdit, onDelete }: SuppliersListProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div
        aria-hidden="true"
        className={`hidden border-b border-gray-100 bg-gray-50/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400 ${DESKTOP_GRID}`}
      >
        <span>Proveedor</span>
        <span>Contacto</span>
        <span>Insumos</span>
        <span>Cuarentena</span>
        <span className="sr-only">Acciones</span>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {suppliers.map((supplier, index) => {
          const contact = supplierContact(supplier)
          const nameId = `supplier-name-${supplier.id}`

          return (
            <li
              key={supplier.id}
              aria-labelledby={nameId}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              className={`flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-indigo-50/40 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both md:px-5 dark:hover:bg-indigo-950/20 ${DESKTOP_GRID}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-3 md:justify-start">
                <p
                  id={nameId}
                  className={`truncate text-sm font-bold ${supplier.isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {supplier.name}
                </p>
                <StatusBadge isActive={supplier.isActive} />
              </div>

              <div className="min-w-0 text-sm">
                {contact.primary ? (
                  <>
                    <p className="truncate text-gray-700 dark:text-gray-300">{contact.primary}</p>
                    {contact.secondary && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{contact.secondary}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs italic text-gray-500 dark:text-gray-400">Sin datos de contacto</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:contents">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {pluralInsumos(supplier.ingredientCount)}
                </p>
                <div>
                  <QuarantineBadge count={supplier.quarantineCount} />
                </div>
              </div>

              <div className="flex gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => onEdit(supplier)}
                  aria-label={`Editar ${supplier.name}`}
                  title="Editar"
                  className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:border-indigo-300 hover:text-indigo-700 active:scale-95 md:size-10 md:min-h-0 md:flex-none md:px-0 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-indigo-300"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  <span className="md:sr-only">Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(supplier)}
                  aria-label={`Dar de baja ${supplier.name}`}
                  title="Dar de baja"
                  className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 active:scale-95 md:size-10 md:min-h-0 md:flex-none md:px-0 dark:border-rose-900/60 dark:bg-gray-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="md:sr-only">Dar de baja</span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Esqueleto con la misma forma que la lista, para que no salte el diseño al cargar. */
export function SuppliersListSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <span className="sr-only">Cargando proveedores...</span>
      <ul aria-hidden="true" className="divide-y divide-gray-100 dark:divide-gray-800">
        {[0, 1, 2].map((row) => (
          <li key={row} className={`flex flex-col gap-3 px-4 py-4 md:px-5 ${DESKTOP_GRID}`}>
            <div className="flex items-center justify-between gap-3 md:justify-start">
              <div className="h-4 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-3.5 w-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="h-6 w-28 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="flex gap-2 md:justify-end">
              <div className="h-11 flex-1 animate-pulse rounded-xl bg-gray-100 md:size-10 md:flex-none dark:bg-gray-800" />
              <div className="h-11 flex-1 animate-pulse rounded-xl bg-gray-100 md:size-10 md:flex-none dark:bg-gray-800" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
