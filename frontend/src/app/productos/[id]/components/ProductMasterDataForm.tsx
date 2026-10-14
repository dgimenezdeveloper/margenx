import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form'
import type { z } from 'zod'
import { handleNumericKeyDown, sanitizeDecimal } from '@/lib/numericInput'
import { productSchema } from '@/schemas/productSchema'

type ProductInput = z.input<typeof productSchema>

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

export interface ProductMasterDataFormProps {
  isCollaborator: boolean
  isDirty: boolean
  productName: string
  salePrice: number | string
  register: UseFormRegister<ProductInput>
  setValue: UseFormSetValue<ProductInput>
  errors: FieldErrors<ProductInput>
}

export function ProductMasterDataForm({
  isCollaborator,
  isDirty,
  productName,
  salePrice,
  register,
  setValue,
  errors,
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
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">
              Nombre del producto
            </label>
            <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">{productName}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">
              Precio de Venta al Público
            </label>
            <p className="mt-1 text-lg font-black text-gray-900 dark:text-white">
              {money(Number(salePrice) || 0)}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
              Nombre del producto
            </label>
            <input
              {...register('name')}
              placeholder="Ej. Medialunas de manteca — docena / Pan flauta 1kg"
              className="min-h-11 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800 dark:focus:ring-2 dark:focus:ring-indigo-500/20"
            />
            {errors.name && (
              <p className="mt-1 text-xs font-bold text-rose-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
              Margen Mínimo Objetivo (%)
            </label>
            <div className="flex min-h-11 h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20">
              <input
                {...register('minMarginPercent')}
                onKeyDown={handleNumericKeyDown}
                onChange={(e) => {
                  const clean = sanitizeDecimal(e.target.value)
                  setValue('minMarginPercent', clean, { shouldValidate: true, shouldDirty: true })
                }}
                inputMode="decimal"
                type="text"
                placeholder="30"
                className="no-spinners w-full bg-transparent text-right text-sm font-bold text-gray-900 outline-none dark:text-white dark:placeholder-gray-500"
              />
              <span className="ml-1 font-bold text-gray-400">%</span>
            </div>
            {errors.minMarginPercent && (
              <p className="mt-1 text-xs font-bold text-rose-500">
                {errors.minMarginPercent.message}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}