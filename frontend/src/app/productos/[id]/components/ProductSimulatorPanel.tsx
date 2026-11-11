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

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

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
  const marginAmount = hasRecipe && cost > 0 ? (Number(watchedSalePrice) || 0) - cost : 0

  return (
    <div className={isMobile ? "flex flex-col flex-1 overflow-hidden mt-4" : "space-y-5"}>
      <div className={isMobile ? "flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5" : "space-y-5"}>
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

        {isMobile && (
          <div className="space-y-2 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Costo Total de Elaboración:</span>
              <strong className="font-extrabold text-gray-900 dark:text-white">{money(cost)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Precio de Venta al Público:</span>
              <strong className="font-extrabold text-gray-900 dark:text-white">{money(Number(watchedSalePrice) || 0)}</strong>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Ganancia Bruta en Pesos:</span>
              <strong
                className={`font-black ${
                  marginAmount >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {money(marginAmount)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {isMobile ? (
        <div className="shrink-0 mt-6 flex gap-3 pt-2">
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