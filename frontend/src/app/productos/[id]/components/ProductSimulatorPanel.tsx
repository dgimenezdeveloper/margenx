import { LoaderCircle, Save } from 'lucide-react'
import type { UseFormSetValue, UseFormRegister, FieldErrors } from 'react-hook-form'
import type { z } from 'zod'
import { productSchema } from '@/schemas/productSchema'
import { NumericInput } from '@/components/NumericInput'

type ProductInput = z.input<typeof productSchema>

export interface ProductSimulatorPanelProps {
  cost: number
  margin: number
  targetMargin: number
  hasRecipe: boolean
  watchedSalePrice: number | string
  isSaving: boolean
  activeStrategy: 'target' | 'custom'
  flashingKey: '5' | '10' | null
  register: UseFormRegister<ProductInput>
  setValue: UseFormSetValue<ProductInput>
  errors: FieldErrors<ProductInput>
  onAdjustPriceFactor: (factor: number, key: '5' | '10') => void
  onApplySuggestedMargin: (target: number) => void
  onSave: () => void
  onCancel?: () => void
  isMobile?: boolean
  setActiveStrategy: (strategy: 'target' | 'custom') => void
}

export function ProductSimulatorPanel({
  cost,
  margin,
  targetMargin,
  hasRecipe,
  watchedSalePrice,
  isSaving,
  activeStrategy,
  flashingKey,
  setValue,
  errors,
  onAdjustPriceFactor,
  onApplySuggestedMargin,
  onSave,
  onCancel,
  isMobile,
  setActiveStrategy,
}: ProductSimulatorPanelProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
          Ajustes Rápidos de Precio
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onAdjustPriceFactor(1.05, '5')}
            className={`min-h-11 rounded-xl border py-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
              flashingKey === '5'
                ? 'border-indigo-600 bg-indigo-600 text-white scale-95 shadow-inner'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            +5%
          </button>
          <button
            type="button"
            onClick={() => onAdjustPriceFactor(1.10, '10')}
            className={`min-h-11 rounded-xl border py-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
              flashingKey === '10'
                ? 'border-indigo-600 bg-indigo-600 text-white scale-95 shadow-inner'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            +10%
          </button>
          <button
            type="button"
            disabled={!hasRecipe || cost <= 0}
            onClick={() => onApplySuggestedMargin(targetMargin)}
            className={`min-h-11 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
              activeStrategy === 'target'
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                : 'border-indigo-600 bg-transparent text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950'
            }`}
          >
            Sugerir {targetMargin}%
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-2">
          Precio de Venta al Público ($)
        </label>
        <NumericInput
          value={watchedSalePrice}
          onChange={(val) => {
            setValue('salePrice', val, { shouldValidate: true, shouldDirty: true })
            setActiveStrategy('custom')
          }}
          prefixSymbol="$"
          prefixClassName="text-lg font-bold"
          placeholder="0,00"
          containerClassName="flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20"
          className="text-lg font-bold text-gray-900 dark:text-white dark:placeholder-gray-500"
          error={errors.salePrice?.message}
        />
      </div>

      <p
        className={`text-xs font-bold ${
          !hasRecipe
            ? 'text-gray-500 dark:text-gray-400'
            : margin >= targetMargin
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
        }`}
      >
        {!hasRecipe
          ? 'Proyección: 0.0% (Sin Receta)'
          : `Proyección: Margen ${margin.toFixed(1)}% ${margin >= targetMargin ? 'Saludable' : 'Bajo'}`}
      </p>

      {isMobile ? (
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="min-h-11 flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="hidden lg:flex min-h-12 h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      )}
    </div>
  )
}