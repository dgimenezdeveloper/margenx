'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Calculator, LoaderCircle, PackageOpen, X } from 'lucide-react'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import { NumericInput } from '@/components/NumericInput'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPortal,
  DialogSheet,
  DialogTitle,
} from '@/components/ui/dialog'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import {
  supplierPresentationSchema,
  type SupplierPresentationInput,
  type SupplierPresentationFormValues,
} from '@/schemas/supplierPresentationSchema'
import { ApiError } from '@/services/api'
import {
  supplierService,
  type SupplierIngredient,
  type SupplierPresentation,
} from '@/services/supplierService'

const money = (val: number) =>
  `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface PresentationEditDialogProps {
  open: boolean
  supplierId: string
  presentation: SupplierPresentation | null
  onClose: () => void
  onSaved: (updated: SupplierIngredient, unitCost: number) => void
}

const inputClass =
  'mt-1.5 h-12 w-full rounded-2xl border bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:bg-white focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-800'
const inputState = (hasError: boolean) =>
  hasError
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/70'
    : 'border-gray-200 focus:border-indigo-600 focus:ring-indigo-600/20 dark:border-gray-700 dark:focus:border-indigo-500'

export function PresentationEditDialog({
  open,
  supplierId,
  presentation,
  onClose,
  onSaved,
}: PresentationEditDialogProps) {
  const getToken = useTokenGetter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SupplierPresentationInput, undefined, SupplierPresentationFormValues>({
    resolver: zodResolver(supplierPresentationSchema),
    defaultValues: {
      supplierCode: '',
      rawDescription: '',
      packageSize: 1,
      packagePrice: 1,
      isDefault: false,
    },
  })

  useEffect(() => {
    if (open && presentation) {
      reset({
        supplierCode: presentation.supplierCode ?? '',
        rawDescription: presentation.rawDescription ?? '',
        packageSize: Number(presentation.packageSize) || 1,
        packagePrice: Number(presentation.packagePrice) || 1,
        isDefault: presentation.isDefault,
      })
    }
  }, [open, presentation, reset])

  const watchedSize = useWatch({ control, name: 'packageSize' }) as string | number
  const watchedPrice = useWatch({ control, name: 'packagePrice' }) as string | number
  const watchedIsDefault = useWatch({ control, name: 'isDefault' }) as boolean

  const numericSize = Number(watchedSize) || 0
  const numericPrice = Number(watchedPrice) || 0

  const calculatedUnitCost = useMemo(() => {
    if (numericSize > 0 && numericPrice > 0) {
      return numericPrice / numericSize
    }
    return null
  }, [numericSize, numericPrice])

  const handleClose = () => {
    setSubmitError(null)
    setShowDiscardConfirm(false)
    onClose()
  }

  const requestClose = () => {
    if (isSubmitting) return
    if (isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    handleClose()
  }

  const onSubmit = async (data: SupplierPresentationFormValues) => {
    if (!presentation) return
    setSubmitError(null)

    if (presentation.isDefault && !data.isDefault) {
      setSubmitError(
        'No puedes quitar el proveedor predeterminado sin asignar otro. Marca otro proveedor como predeterminado para reemplazarlo.'
      )
      return
    }

    try {
      const result = await supplierService.addPackaging(getToken, supplierId, {
        ingredientId: presentation.ingredient.id,
        packageSize: data.packageSize,
        packageUnit: presentation.packageUnit as 'kg' | 'l' | 'u',
        packagePrice: data.packagePrice,
        isDefault: data.isDefault,
        supplierCode: data.supplierCode?.trim() || null,
        rawDescription: data.rawDescription?.trim() || null,
      })

      const finalCost =
        typeof result.unitCost === 'number' ? result.unitCost : Number(result.unitCost)

      onSaved(result.supplierIngredient, finalCost)
      handleClose()
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setError('supplierCode', { type: 'server', message: error.message }, { shouldFocus: true })
        return
      }
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'No se pudo guardar la presentación. Revisá tu conexión y volvé a intentar.'
      )
    }
  }

  if (!presentation) return null

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) requestClose() }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogSheet className="max-h-[92dvh] overflow-y-auto">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" aria-hidden="true" />

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <PackageOpen className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Editar presentación</DialogTitle>
                    <DialogDescription className="mt-0.5">
                      {presentation.ingredient.name} ({presentation.packageUnit})
                    </DialogDescription>
                  </div>
                </div>
                <DialogClose
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-full p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Cerrar modal"
                >
                  <X className="size-5" aria-hidden="true" />
                </DialogClose>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="supplier-code-input" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Código de artículo del proveedor (SKU) <span className="font-normal text-gray-500">(opcional)</span>
                  </label>
                  <input
                    id="supplier-code-input"
                    {...register('supplierCode')}
                    placeholder="Ej. HAR188"
                    aria-invalid={errors.supplierCode ? 'true' : 'false'}
                    aria-describedby={errors.supplierCode ? 'supplier-code-error' : undefined}
                    className={`${inputClass} ${inputState(!!errors.supplierCode)} font-mono`}
                  />
                  {errors.supplierCode && (
                    <p id="supplier-code-error" className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                      {errors.supplierCode.message}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Se utiliza para actualizar precios automáticamente al reenviar listas por correo.
                  </p>
                </div>

                <div>
                  <label htmlFor="raw-description-input" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Descripción según lista mayorista <span className="font-normal text-gray-500">(opcional)</span>
                  </label>
                  <input
                    id="raw-description-input"
                    {...register('rawDescription')}
                    placeholder="Ej. HARINA SARITA 000 X 25 KG"
                    className={`${inputClass} ${inputState(!!errors.rawDescription)}`}
                  />
                  {errors.rawDescription && (
                    <p className="mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                      {errors.rawDescription.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="package-size-input" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Tamaño del bulto ({presentation.packageUnit})
                    </label>
                    <NumericInput
                      id="package-size-input"
                      value={watchedSize}
                      onChange={(val) => setValue('packageSize', Number(val) || 0, { shouldValidate: true, shouldDirty: true })}
                      placeholder="25"
                      containerClassName="min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-500 dark:border-gray-700 dark:bg-gray-800"
                      className="text-sm font-bold text-gray-900 dark:text-white"
                      error={errors.packageSize?.message}
                    />
                  </div>

                  <div>
                    <label htmlFor="package-price-input" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Precio cerrado ($)
                    </label>
                    <NumericInput
                      id="package-price-input"
                      value={watchedPrice}
                      onChange={(val) => setValue('packagePrice', Number(val) || 0, { shouldValidate: true, shouldDirty: true })}
                      prefixSymbol="$"
                      placeholder="0,00"
                      containerClassName="min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-500 dark:border-gray-700 dark:bg-gray-800"
                      className="text-sm font-bold text-gray-900 dark:text-white"
                      error={errors.packagePrice?.message}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/40">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                    <Calculator className="size-3.5" aria-hidden="true" />
                    <span>Calculadora de equivalencia</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Costo unitario equivalente:</span>
                    <strong className="text-sm font-black text-indigo-950 dark:text-white">
                      {calculatedUnitCost !== null ? `${money(calculatedUnitCost)} / ${presentation.packageUnit}` : '—'}
                    </strong>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3.5 cursor-pointer dark:border-gray-700 dark:bg-gray-800/50">
                  <input
                    type="checkbox"
                    {...register('isDefault')}
                    className="mt-0.5 size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 dark:text-white">
                      Marcar como presentación predeterminada
                    </span>
                    <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                      {presentation.isDefault && !watchedIsDefault
                        ? 'No puedes desmarcar el predeterminado sin asignar otro primero.'
                        : watchedIsDefault
                        ? `Al guardar, el costo activo del insumo en recetas pasará a ser ${calculatedUnitCost ? money(calculatedUnitCost) : '$0.00'}.`
                        : 'Almacena la presentación sin alterar el costo activo de recetas.'}
                    </p>
                  </div>
                </label>
              </div>

              {submitError && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <p>{submitError}</p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={isSubmitting}
                  className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </DialogSheet>
        </DialogPortal>
      </Dialog>

      <UnsavedChangesDialog
        open={showDiscardConfirm}
        onConfirm={handleClose}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </>
  )
}