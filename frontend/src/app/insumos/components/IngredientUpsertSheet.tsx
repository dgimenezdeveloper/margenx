import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { AlertTriangle, ChevronRight, History, LoaderCircle, Package, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { ingredientSchema } from '@/schemas/ingredientSchema'
import type { Ingredient, IngredientProductUsage } from '@/services/ingredientService'
import type { SupplierIngredient } from '@/services/supplierService'
import { IngredientSupplierList } from './IngredientSupplierList'
import { Dialog, DialogPortal, DialogBackdrop, DialogSheet, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { formatQuantityWithUnit } from '@/lib/format'
import { cn } from '@/lib/utils'

const ingredientUnits = ['kg', 'litro', 'unidad'] as const

interface IngredientUpsertSheetProps {
  selected: Ingredient | null
  newOpen: boolean
  showDeleteConfirm: boolean
  isCollaborator: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onRequestClose: () => void
  onRequestDelete: () => void
  onDeleteConfirm: () => void
  onCancelDelete: () => void
  onOpenHistory: () => void
  onOpenPackaging: () => void
  onEditConnection: (connection: SupplierIngredient) => void
  onMakeDefault: (connection: SupplierIngredient) => void
  register: UseFormRegister<z.input<typeof ingredientSchema>>
  setValue: UseFormSetValue<z.input<typeof ingredientSchema>>
  errors: FieldErrors<z.input<typeof ingredientSchema>>
  selectedUnit: z.input<typeof ingredientSchema>['unit'] | undefined
  money: (value: number) => string
  onNumericKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onDecimalChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCostBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  watchedCurrentCost?: string | number
  usedProducts?: IngredientProductUsage[]
  isLoadingProducts?: boolean
}

export function IngredientUpsertSheet({
  selected,
  newOpen,
  showDeleteConfirm,
  isCollaborator,
  onSubmit,
  onRequestClose,
  onRequestDelete,
  onDeleteConfirm,
  onCancelDelete,
  onOpenHistory,
  onOpenPackaging,
  onEditConnection,
  onMakeDefault,
  register,
  setValue,
  errors,
  selectedUnit,
  money,
  onNumericKeyDown,
  onDecimalChange,
  onCostBlur,
  usedProducts = [],
  isLoadingProducts = false,
}: IngredientUpsertSheetProps) {
  if (!selected && !newOpen) {
    return null
  }

  const hasDefaultSupplier = selected?.supplierConnections?.some((c) => c.isDefault)

  return (
    <Dialog open={!!selected || newOpen} onOpenChange={(open) => { if (!open) onRequestClose() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogSheet>
          <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />

          {showDeleteConfirm ? (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 py-4">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                <AlertTriangle className="size-7 text-rose-600 dark:text-rose-400" />
              </div>
              <DialogTitle>¿Eliminar insumo?</DialogTitle>
              <DialogDescription>
                Estás a punto de eliminar <strong>{selected?.name}</strong>. Esta acción no se puede deshacer.
              </DialogDescription>
              <div className="mt-8 flex w-full gap-3">
                <button
                  type="button"
                  onClick={onCancelDelete}
                  className="flex-1 min-h-11 cursor-pointer rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onDeleteConfirm}
                  className="flex-1 min-h-11 cursor-pointer rounded-2xl bg-rose-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-rose-700 transition"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
              <div className="flex shrink-0 items-start justify-between pb-4">
                <div>
                  <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    {selected ? selected.name : 'Despensa'}
                  </p>
                  <DialogTitle className="mt-1 text-2xl">
                    {selected ? 'Actualizar Costo' : 'Nuevo Insumo'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {selected
                      ? `Actualizá el nombre, unidad o costo unitario de ${selected.name} y sus proveedores asociados.`
                      : 'Cargá el nombre, la unidad de medida y el costo unitario del nuevo insumo.'}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-1">
                  {selected && (
                    <>
                      <button
                        type="button"
                        onClick={onOpenHistory}
                        className="cursor-pointer rounded-full p-2 text-indigo-500 transition hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        title="Ver historial de precios"
                        aria-label="Ver historial de precios"
                      >
                        <History className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={onRequestDelete}
                        className="cursor-pointer rounded-full p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title="Eliminar insumo"
                        aria-label="Eliminar insumo"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </>
                  )}
                  <DialogClose
                    className="cursor-pointer rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    aria-label="Cerrar modal"
                  >
                    <X className="size-5" />
                  </DialogClose>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {selected && (
                  <IngredientSupplierList
                    selected={selected}
                    isCollaborator={isCollaborator}
                    onOpenPackaging={onOpenPackaging}
                    onEditConnection={onEditConnection}
                    onMakeDefault={onMakeDefault}
                    money={money}
                  />
                )}

                <div>
                  <label htmlFor="ingredient-name" className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    Nombre del insumo
                  </label>
                  <input
                    id="ingredient-name"
                    {...register('name')}
                    placeholder="Ej. Harina 0000"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'ingredient-name-error' : undefined}
                    className={cn(
                      'mt-2 h-12 w-full rounded-2xl border bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-500',
                      errors.name
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-rose-500/70'
                        : 'border-gray-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 dark:border-gray-700 dark:focus:border-indigo-500'
                    )}
                  />
                  {errors.name && (
                    <p id="ingredient-name-error" role="alert" className="mt-1 text-xs font-bold text-rose-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Unidad de medida
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ingredientUnits.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setValue('unit', u, { shouldValidate: true, shouldDirty: true })}
                        className={`rounded-xl cursor-pointer border px-3.5 py-2 text-xs font-bold transition ${
                          selectedUnit === u
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  {errors.unit && <p className="mt-1 text-xs font-bold text-rose-500">{errors.unit.message}</p>}
                </div>

                <div>
                  <label htmlFor="ingredient-current-cost" className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    Costo unitario ({selectedUnit || selected?.unit})
                  </label>
                  <div className="mt-2 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20">
                    <span className="text-lg font-bold text-gray-400">$</span>
                    <input
                      id="ingredient-current-cost"
                      {...register('currentCost')}
                      onKeyDown={onNumericKeyDown}
                      onChange={onDecimalChange}
                      onBlur={onCostBlur}
                      inputMode="decimal"
                      type="text"
                      placeholder="0,00"
                      aria-invalid={!!errors.currentCost}
                      aria-describedby={errors.currentCost ? 'ingredient-cost-error' : undefined}
                      className="no-spinners w-full bg-transparent px-2 text-lg font-bold text-gray-900 outline-none dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                  {errors.currentCost && (
                    <p id="ingredient-cost-error" role="alert" className="mt-1 text-xs font-bold text-rose-500">
                      {errors.currentCost.message}
                    </p>
                  )}
                </div>

                {hasDefaultSupplier && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <p>El costo manual puede ser reemplazado por la próxima actualización automática del proveedor.</p>
                  </div>
                )}

                {selected && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                          Se usa en
                        </span>
                      </div>
                      {usedProducts && usedProducts.length > 0 && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {usedProducts.length} {usedProducts.length === 1 ? 'producto' : 'productos'}
                        </span>
                      )}
                    </div>

                    {isLoadingProducts ? (
                      <div className="flex items-center justify-center p-4 text-xs font-semibold text-gray-400">
                        <LoaderCircle className="size-4 animate-spin mr-2" />
                        Cargando productos vinculados...
                      </div>
                    ) : usedProducts && usedProducts.length > 0 ? (
                      <ul
                        aria-label="Productos que usan este insumo"
                        className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1"
                      >
                        {usedProducts.map((prod) => (
                          <li key={prod.id}>
                            <Link
                              to={`/productos/${prod.id}`}
                              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="truncate font-bold text-gray-900 dark:text-gray-100">
                                  {prod.name}
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  Usa: <strong className="text-gray-700 dark:text-gray-300">{formatQuantityWithUnit(prod.quantity, selected.unit)}</strong>
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {money(Number(prod.salePrice) || 0)}
                                </span>
                                <ChevronRight className="size-4 text-gray-400" aria-hidden="true" />
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
                        Este insumo no se utiliza en ninguna receta activa.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex shrink-0 gap-3 pt-2">
                <DialogClose
                  className="flex-1 min-h-11 cursor-pointer rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </DialogClose>
                <button
                  type="submit"
                  className="flex-1 min-h-11 cursor-pointer rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
                >
                  {selected ? 'Guardar Costo' : 'Crear Insumo'}
                </button>
              </div>
            </form>
          )}
        </DialogSheet>
      </DialogPortal>
    </Dialog>
  )
}