'use client'

import Link from 'next/link'
import { Pencil, ShieldAlert, Star, Trash2 } from 'lucide-react'

import { formatPackage, formatPackagePrice } from '@/lib/supplierDisplay'
import { formatUnit } from '@/lib/format'
import type { SupplierPresentation } from '@/services/supplierService'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'

interface SupplierPresentationsListProps {
  presentations: SupplierPresentation[]
  onEdit: (presentation: SupplierPresentation) => void
  onDelete: (presentation: SupplierPresentation) => void
  onMakeDefault: (presentation: SupplierPresentation) => void
}

/**
 * Columnas fijas en escritorio (#434): insumo, presentación, precio del bulto, costo por unidad,
 * código y acciones. El insumo es la más ancha y se lee completo (#362). En el celular, cada fila
 * es una tarjeta con los mismos datos en el mismo orden.
 */
const DESKTOP_GRID = 'md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_9.25rem] md:items-center md:gap-4'

const ICON_BUTTON = 'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border bg-white transition dark:bg-gray-800'

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
        data-testid="supplier-presentations-header"
        className={`hidden border-b border-gray-100 bg-gray-50/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400 ${DESKTOP_GRID}`}
      >
        <span>Insumo</span>
        <span>Presentación</span>
        <span>Precio del bulto</span>
        <span>Costo por unidad</span>
        <span>Código</span>
        <span className="text-right">Acciones</span>
      </div>

      <ul aria-label="Presentaciones mayoristas" className="divide-y divide-gray-100 dark:divide-gray-800">
        {presentations.map((item) => {
          const numSize = Number(item.packageSize) || 1
          const numPrice = Number(item.packagePrice) || 0
          const unitCost = numPrice / numSize

          return (
            <li
              key={item.id}
              className={`flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-indigo-50/40 md:px-5 dark:hover:bg-indigo-950/20 ${DESKTOP_GRID}`}
            >
              <div className="min-w-0">
                {/* El nombre no se recorta: baja de renglón, y la etiqueta de cuarentena pasa abajo si no entra (#362). */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p
                    title={item.ingredient.name}
                    className="min-w-0 break-words   text-sm font-bold text-gray-900 dark:text-gray-100"
                  >
                    {item.ingredient.name}
                  </p>
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
                {item.rawDescription && (
                  <p title={item.rawDescription} className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    {item.rawDescription}
                  </p>
                )}
              </div>

              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                <span className="text-xs font-normal text-gray-500 md:hidden dark:text-gray-400">Presentación: </span>
                {formatPackage(item.packageSize, item.packageUnit)}
              </div>

              <div className="text-sm font-bold text-gray-900 dark:text-white">
                <span className="text-xs font-normal text-gray-500 md:hidden dark:text-gray-400">Precio del bulto: </span>
                {formatPackagePrice(item.packagePrice)}
              </div>

              <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                <span className="text-xs font-normal text-gray-500 md:hidden dark:text-gray-400">Costo por unidad: </span>
                {formatPackagePrice(unitCost)} / {formatUnit(item.packageUnit)}
              </div>

              <div className="min-w-0 text-xs">
                {item.supplierCode ? (
                  <p className="font-mono font-bold text-gray-700 dark:text-gray-300">
                    <span className="font-sans font-normal text-gray-500 md:hidden dark:text-gray-400">Código: </span>
                    {item.supplierCode}
                  </p>
                ) : (
                  <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    Sin código
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 md:justify-end">
                {item.isDefault ? (
                  <span
                    role="img"
                    aria-label="Presentación predeterminada"
                    title="Presentación predeterminada"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-indigo-600 dark:text-indigo-300"
                  >
                    <Star className="size-5 fill-current" aria-hidden="true" />
                  </span>
                ) : (
                  !item.isQuarantined && (
                    <button
                      type="button"
                      onClick={() => onMakeDefault(item)}
                      aria-label={`Usar como predeterminada la presentación de ${item.ingredient.name}`}
                      title="Usar como predeterminada"
                      className={`${ICON_BUTTON} border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 ${CANONICAL_FOCUS_CLASSES}`}
                    >
                      <Star className="size-4" aria-hidden="true" />
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  aria-label={`Editar presentación de ${item.ingredient.name}`}
                  title="Editar presentación"
                  className={`${ICON_BUTTON} border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-indigo-300 ${CANONICAL_FOCUS_CLASSES}`}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  aria-label={`Quitar presentación de ${item.ingredient.name}`}
                  title="Quitar presentación"
                  className={`${ICON_BUTTON} border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40 ${CANONICAL_FOCUS_CLASSES}`}
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
