'use client'

import Link from 'next/link'
import { Pencil, ShieldAlert, Star, Trash2 } from 'lucide-react'

import { formatPackage, formatPackagePrice } from '@/lib/supplierDisplay'
import type { SupplierPresentation } from '@/services/supplierService'

interface SupplierPresentationsListProps {
  presentations: SupplierPresentation[]
  onEdit: (presentation: SupplierPresentation) => void
  onDelete: (presentation: SupplierPresentation) => void
  onMakeDefault: (presentation: SupplierPresentation) => void
}

const DESKTOP_GRID =
  'md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-4'

export function SupplierPresentationsList({
  presentations,
  onEdit,
  onDelete,
  onMakeDefault,
}: SupplierPresentationsListProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div
        aria-hidden="true"
        className={`hidden border-b border-gray-100 bg-gray-50/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400 ${DESKTOP_GRID}`}
      >
        <span>Insumo</span>
        <span>Código / Descripción</span>
        <span>Empaque</span>
        <span>Precio y Equivalencia</span>
        <span className="sr-only">Acciones</span>
      </div>

      <ul aria-label="Presentaciones mayoristas" className="divide-y divide-gray-100 dark:divide-gray-800">
        {presentations.map((item) => {
          const numSize = Number(item.packageSize) || 1
          const numPrice = Number(item.packagePrice) || 0
          const unitCost = numPrice / numSize

          return (
            <li
              key={item.id}
              className={`flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-indigo-50/40 md:px-5 dark:hover:bg-indigo-950/20 ${DESKTOP_GRID}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                    {item.ingredient.name}
                  </p>
                  {item.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      <Star className="size-3" aria-hidden="true" />
                      Predeterminada
                    </span>
                  )}
                  {item.isQuarantined && (
                    <Link
                      href="/proveedores/cuarentena"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-600/30 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300"
                    >
                      <ShieldAlert className="size-3" aria-hidden="true" />
                      En cuarentena
                    </Link>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Unidad base: {item.packageUnit}
                </p>
              </div>

              <div className="min-w-0 text-xs">
                {item.supplierCode ? (
                  <p className="font-mono font-bold text-gray-700 dark:text-gray-300">
                    SKU: {item.supplierCode}
                  </p>
                ) : (
                  <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    Sin código
                  </span>
                )}
                {item.rawDescription && (
                  <p className="truncate text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.rawDescription}
                  </p>
                )}
              </div>

              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formatPackage(item.packageSize, item.packageUnit)}
              </div>

              <div className="text-xs">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatPackagePrice(item.packagePrice)}
                </p>
                <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                  Equiv: {formatPackagePrice(unitCost)} / {item.packageUnit}
                </p>
              </div>

              <div className="flex items-center gap-2 md:justify-end">
                {!item.isDefault && !item.isQuarantined && (
                  <button
                    type="button"
                    onClick={() => onMakeDefault(item)}
                    className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    Hacer predeterminada
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  aria-label={`Editar presentación de ${item.ingredient.name}`}
                  title="Editar presentación"
                  className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-indigo-300  dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-indigo-300"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  aria-label={`Quitar presentación de ${item.ingredient.name}`}
                  title="Quitar presentación"
                  className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/60 dark:bg-gray-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}