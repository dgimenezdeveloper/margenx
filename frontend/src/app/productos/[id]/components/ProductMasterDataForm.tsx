import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form'
import type { z } from 'zod'
import { productSchema } from '@/schemas/productSchema'
import { NumericInput } from '@/components/NumericInput'
import { formatMoney } from '@/lib/format'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { cn } from '@/lib/utils'

type ProductInput = z.input<typeof productSchema>

const money = (val: number) => formatMoney(val)

export interface ProductMasterDataFormProps {
  isCollaborator: boolean
  isDirty: boolean
  productName: string
  salePrice: number | string
  register: UseFormRegister<ProductInput>
  setValue: UseFormSetValue<ProductInput>
  errors: FieldErrors<ProductInput>
  watchedMinMargin: string | number
}

export function ProductMasterDataForm({
  isCollaborator,
  isDirty,
  productName,
  salePrice,
  register,
  setValue,
  errors,
  watchedMinMargin,
}: ProductMasterDataFormProps) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Datos del Producto</h2>
        {!isCollaborator && isDirty && (
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            Cambios sin guardar
          </span>
        )}
      </div>

      {isCollaborator ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="block text-xs font-bold text-gray-500 dark:text-gray-400">
              Nombre del producto
            </span>
            <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">
              {productName}
            </p>
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-500 dark:text-gray-400">
              Precio de Venta al Público
            </span>
            <p className="mt-1 text-lg font-black text-gray-900 dark:text-white">
              {money(Number(salePrice) || 0)}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="product-name" className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
              Nombre del producto
            </label>
            <input
              id="product-name"
              {...register('name')}
              placeholder="Ej. Medialunas de manteca — docena / Pan flauta 1kg"
              className={cn(
                'min-h-11 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800',
                CANONICAL_FOCUS_CLASSES
              )}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'product-name-error' : undefined}
            />
            {errors.name && (
              <p id="product-name-error" role="alert" className="mt-1 text-xs font-bold text-rose-500">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="product-min-margin" className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
              Margen Mínimo Objetivo (%)
            </label>
            <NumericInput
              id="product-min-margin"
              aria-label="Margen Mínimo Objetivo (%)"
              value={watchedMinMargin}
              onChange={(val) => setValue('minMarginPercent', val, { shouldValidate: true, shouldDirty: true })}
              suffixSymbol="%"
              suffixClassName="font-bold"
              placeholder="30"
              containerClassName={cn(
                'flex min-h-11 h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800',
                CANONICAL_FOCUS_CLASSES
              )}
              className="text-right text-sm font-bold text-gray-900 dark:text-white dark:placeholder-gray-500"
              error={errors.minMarginPercent?.message}
            />
          </div>
        </>
      )}
    </section>
  )
}