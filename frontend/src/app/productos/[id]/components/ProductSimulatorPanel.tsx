import { LoaderCircle, Save } from 'lucide-react'
import type { UseFormSetValue, UseFormRegister, FieldErrors } from 'react-hook-form'
import type { z } from 'zod'
import { productSchema } from '@/schemas/productSchema'
import { NumericInput } from '@/components/NumericInput'
import { formatPercent } from '@/lib/format'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { cn } from '@/lib/utils'
import {
  HEALTH_BUCKET_META,
  resolveProductHealthBucket,
} from '@/lib/healthBucket'

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
  const bucket = resolveProductHealthBucket({
    hasRecipe: hasRecipe && cost > 0,
    marginPercent: margin,
    minMarginPercent: targetMargin,
  })
  const meta = HEALTH_BUCKET_META[bucket]

  const projectionColor =
    bucket === 'draft'
      ? 'text-gray-500 dark:text-gray-400'
      : bucket === 'loss' || bucket === 'risk'
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-emerald-700 dark:text-emerald-400'

  return (
    <div className={isMobile ? 'flex flex-col flex-1 overflow-hidden mt-4' : 'space-y-5'}>
      <div className={isMobile ? 'flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5' : 'space-y-5'}>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
            Ajustes Rápidos de Precio
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onAdjustPriceFactor(1.05, '5')}
              className={cn(
                'min-h-11 rounded-xl border py-2 text-xs font-bold transition-all duration-150 cursor-pointer',
                CANONICAL_FOCUS_CLASSES,
                flashingKey === '5'
                  ? 'border-indigo-600 bg-indigo-600 text-white scale-95 shadow-inner'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              )}
            >
              +5%
            </button>
            <button
              type="button"
              onClick={() => onAdjustPriceFactor(1.10, '10')}
              className={cn(
                'min-h-11 rounded-xl border py-2 text-xs font-bold transition-all duration-150 cursor-pointer',
                CANONICAL_FOCUS_CLASSES,
                flashingKey === '10'
                  ? 'border-indigo-600 bg-indigo-600 text-white scale-95 shadow-inner'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              )}
            >
              +10%
            </button>
            <button
              type="button"
              disabled={!hasRecipe || cost <= 0}
              onClick={() => onApplySuggestedMargin(targetMargin)}
              className={cn(
                'min-h-11 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50',
                CANONICAL_FOCUS_CLASSES,
                activeStrategy === 'target'
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-indigo-600 bg-transparent text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950'
              )}
            >
              Sugerir {formatPercent(targetMargin, { minDecimals: 0 })}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="simulator-sale-price"
            className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-2"
          >
            Precio de Venta al Público ($)
          </label>
          <NumericInput
            id="simulator-sale-price"
            aria-label="Precio de Venta al Público ($)"
            value={watchedSalePrice}
            onChange={(val) => {
              setValue('salePrice', val, { shouldValidate: true, shouldDirty: true })
              setActiveStrategy('custom')
            }}
            prefixSymbol="$"
            prefixClassName="text-lg font-bold"
            placeholder="0,00"
            containerClassName={cn(
              'flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800',
              CANONICAL_FOCUS_CLASSES
            )}
            className="text-lg font-bold text-gray-900 dark:text-white dark:placeholder-gray-500"
            error={errors.salePrice?.message}
          />
        </div>

        <p className={`text-xs font-bold ${projectionColor}`}>
          {bucket === 'draft'
            ? 'Proyección: 0,0 % · Borrador'
            : `Proyección: Margen ${formatPercent(margin)} · ${meta.label}`}
        </p>
      </div>

      {isMobile ? (
        <div className="shrink-0 mt-6 flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'min-h-11 flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer active:scale-95 transition-all',
              CANONICAL_FOCUS_CLASSES
            )}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              'min-h-11 flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all',
              CANONICAL_FOCUS_CLASSES
            )}
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
          className={cn(
            'hidden lg:flex min-h-12 h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50',
            CANONICAL_FOCUS_CLASSES
          )}
        >
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      )}
    </div>
  )
}