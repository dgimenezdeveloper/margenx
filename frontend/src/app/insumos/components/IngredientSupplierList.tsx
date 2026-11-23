import Link from 'next/link'
import { Pencil, Plus, ShieldAlert, Star, Truck } from 'lucide-react'

import type { Ingredient } from '@/services/ingredientService'
import type { SupplierIngredient } from '@/services/supplierService'
import { formatUnit } from '@/lib/format'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { formatPackage } from '@/lib/supplierDisplay'

/**
 * Lista de proveedores y presentaciones asociados a un insumo seleccionado.
 * Centraliza la comparación del costo por proveedor, la marca de default
 * y la posibilidad de editar o crear nuevas asociaciones mayoristas.
 */
interface IngredientSupplierListProps {
  selected: Ingredient
  isCollaborator: boolean
  onOpenPackaging: () => void
  onEditConnection: (connection: SupplierIngredient) => void
  onMakeDefault: (connection: SupplierIngredient) => void
  money: (value: number) => string
}

/**
 * Muestra los proveedores asociados a un insumo y permite elegir el default.
 * La intención es mantener toda la lógica de costos por presentación y cambio de proveedor
 * concentrada en esta vista de detalle, evitando mezclarla con la página principal.
 */
export function IngredientSupplierList({
  selected,
  isCollaborator,
  onOpenPackaging,
  onEditConnection,
  onMakeDefault,
  money,
}: IngredientSupplierListProps) {
  if (isCollaborator || !selected) {
    return null
  }

  const quarantinedCount = selected.supplierConnections?.filter((conn) => conn.isQuarantined).length ?? 0

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
            Proveedores y presentaciones
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenPackaging}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 cursor-pointer shadow-xs inline-flex items-center gap-1"
        >
          <Plus className="size-3" aria-hidden="true" /> Asociar otra presentación
        </button>
      </div>

      {quarantinedCount > 0 && (
        <div
          role="note"
          className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <p className="flex items-start gap-2 text-xs font-semibold text-amber-900 dark:text-amber-300">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {quarantinedCount === 1
              ? '1 precio de este insumo está retenido en cuarentena. El costo no cambia hasta que decidas.'
              : `${quarantinedCount} precios de este insumo están retenidos en cuarentena. El costo no cambia hasta que decidas.`}
          </p>
          <Link
            href="/proveedores/cuarentena"
            className="inline-flex min-h-11 shrink-0 items-center text-xs font-bold text-amber-800 underline underline-offset-2 hover:text-amber-950 dark:text-amber-300"
          >
            Revisar en Cuarentena
          </Link>
        </div>
      )}

      {selected.supplierConnections && selected.supplierConnections.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {selected.supplierConnections.map((conn) => {
            const unitCost = conn.packagePrice / conn.packageSize
            return (
              <li
                key={conn.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 shadow-sm dark:bg-gray-900 ${
                  conn.isQuarantined ? 'border-amber-300 dark:border-amber-800' : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {conn.supplier?.name || 'Proveedor Desconocido'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatPackage(conn.packageSize, conn.packageUnit)} · Precio del bulto: {money(conn.packagePrice)}
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Costo por unidad: {money(unitCost)} / {formatUnit(selected.unit)}
                  </span>
                  {conn.isQuarantined && (
                    <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                      <ShieldAlert className="size-3" aria-hidden="true" />
                      En cuarentena
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* La misma estrella que la ficha del proveedor; cambiar pide confirmación (#434). */}
                  {conn.isDefault ? (
                    <span
                      role="img"
                      aria-label="Presentación predeterminada"
                      title="Presentación predeterminada"
                      className="inline-flex min-h-11 min-w-11 items-center justify-center text-indigo-600 dark:text-indigo-300"
                    >
                      <Star className="size-5 fill-current" aria-hidden="true" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMakeDefault(conn)}
                      aria-label={`Usar como predeterminada la presentación de ${conn.supplier?.name || 'este proveedor'}`}
                      title="Usar como predeterminada"
                      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 ${CANONICAL_FOCUS_CLASSES}`}
                    >
                      <Star className="size-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEditConnection(conn)}
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition cursor-pointer"
                    title="Editar presentación"
                    aria-label={`Editar presentación de ${conn.supplier?.name || 'este proveedor'}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            No hay proveedores asociados. Calculá el costo equivalente desde bultos mayoristas cerrados (ej. bolsa de 50 kg).
          </p>
        </div>
      )}
    </div>
  )
}