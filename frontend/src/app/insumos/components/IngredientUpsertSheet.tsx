import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { AlertTriangle, History, Trash2, X } from 'lucide-react'
import { z } from 'zod'

import { ingredientSchema } from '@/schemas/ingredientSchema'
import type { Ingredient } from '@/services/ingredientService'
import type { SupplierIngredient } from '@/services/supplierService'
import { IngredientSupplierList } from './IngredientSupplierList'
import { NumericInput } from '@/components/NumericInput'

const ingredientUnits = ['kg', 'litro', 'unidad'] as const

interface IngredientUpsertSheetProps {
  selected: Ingredient | null
  newOpen: boolean
  showDeleteConfirm: boolean
  isCollaborator: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
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
  watchedCurrentCost?: string | number
  money: (value: number) => string
}

export function IngredientUpsertSheet({
  selected,
  newOpen,
  showDeleteConfirm,
  isCollaborator,
  onSubmit,
  onClose,
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
  watchedCurrentCost,
  money,
}: IngredientUpsertSheetProps) {
  if (!selected && !newOpen) {
    return null
  }

  const hasDefaultSupplier = selected?.supplierConnections?.some((c) => c.isDefault)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs md:items-center animate-in fade-in">
      <div className="fixed inset-0" onClick={onRequestClose} />

      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-transparent bg-white p-6 shadow-2xl md:rounded-3xl dark:border-gray-800 dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />

        {showDeleteConfirm ? (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 py-4">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <AlertTriangle className="size-7 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">¿Eliminar insumo?</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Estás a punto de eliminar <strong>{selected?.name}</strong>. Esta acción no se puede deshacer.
            </p>
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
          <form onSubmit={onSubmit} noValidate>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  {selected ? selected.name : 'Despensa'}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {selected ? 'Actualizar Costo' : 'Nuevo Insumo'}
                </h2>
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
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  aria-label="Cerrar modal"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

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

            {!selected && (
              <label className="mt-5 block text-xs font-bold text-gray-600 dark:text-gray-300">
                Nombre del insumo
                <input
                  {...register('name')}
                  placeholder="Ej. Harina 0000"
                  className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800 dark:focus:ring-2 dark:focus:ring-indigo-500/20"
                />
                {errors.name && <p className="mt-1 text-xs font-bold text-rose-500">{errors.name.message}</p>}
              </label>
            )}

            {!selected && (
              <div className="mt-4">
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
            )}

            <label htmlFor="costo-unitario" className="mt-4 block text-xs font-bold text-gray-600 dark:text-gray-300">
              Costo unitario ({selected ? selected.unit : selectedUnit})
              <NumericInput
                id="costo-unitario"
                aria-label={`Costo unitario (${selected ? selected.unit : selectedUnit})`}
                value={watchedCurrentCost ?? (selected ? String(selected.currentCost) : '')}
                onChange={(val) => setValue('currentCost', val, { shouldValidate: true, shouldDirty: true })}
                prefixSymbol="$"
                prefixClassName="text-lg font-bold"
                placeholder="0,00"
                containerClassName="mt-2 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20"
                className="text-lg font-bold text-gray-900 dark:text-white dark:placeholder-gray-500"
                error={errors.currentCost?.message}
              />
            </label>

            {hasDefaultSupplier && (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <p>El costo manual puede ser reemplazado por la próxima actualización automática del proveedor.</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-11 cursor-pointer rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 min-h-11 cursor-pointer rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
              >
                {selected ? 'Guardar Costo' : 'Crear Insumo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}