'use client'

import { useAuth } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, LoaderCircle, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { z } from 'zod'

import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPortal,
  DialogSheet,
  DialogTitle,
} from '@/components/ui/dialog'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { formatNumeroAR, parseNumeroAR } from '@/lib/numericFormat'
import { handleDecimalARKeyDown, sanitizeDecimalAR } from '@/lib/numericInput'
import { cn } from '@/lib/utils'
import { ingredientSchema, type IngredientFormValues } from '@/schemas/ingredientSchema'
import { ApiError } from '@/services/api'
import { ingredientService, type Ingredient } from '@/services/ingredientService'

const ingredientUnits = ['kg', 'litro', 'unidad'] as const

interface QuickCreateIngredientModalProps {
  isOpen: boolean
  initialName?: string
  onClose: () => void
  onCreated: (ingredient: Ingredient) => void
}

export function QuickCreateIngredientModal({
  isOpen,
  initialName = '',
  onClose,
  onCreated,
}: QuickCreateIngredientModalProps) {
  const { getToken } = useAuth()
  const nameRef = useRef<HTMLInputElement | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof ingredientSchema>, undefined, IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    mode: 'onChange',
    defaultValues: { name: initialName.trim(), unit: 'kg', currentCost: '' },
  })

  const selectedUnit = useWatch({ control, name: 'unit' })

  useEffect(() => {
    if (isOpen) {
      reset({ name: initialName.trim(), unit: 'kg', currentCost: '' })
    }
  }, [isOpen, initialName, reset])

  const handleClose = () => {
    if (isSubmitting) return
    setSubmitError(null)
    onClose()
  }

  const onSubmit = async (data: IngredientFormValues) => {
    setSubmitError(null)
    const canonicalUnit =
      data.unit === 'litro' ? 'l' : data.unit === 'unidad' ? 'u' : data.unit

    try {
      const created = await ingredientService.create(getToken, {
        name: data.name.trim(),
        unit: canonicalUnit,
        currentCost: data.currentCost,
      })
      onCreated(created)
      onClose()
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setError('name', { type: 'server', message: error.message }, { shouldFocus: true })
        return
      }
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'No se pudo crear el insumo. Revisá tu conexión y volvé a intentar.'
      )
    }
  }

  const { ref: nameFieldRef, ...nameField } = register('name')
  const { onBlur: onRegisterCostBlur, ...costField } = register('currentCost')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogPortal>
        <DialogBackdrop className="z-70" />
        <DialogSheet initialFocus={nameRef} className="z-70">
          <div
            className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden dark:bg-gray-700"
            aria-hidden="true"
          />

          <form
            onSubmit={(event) => {
              event.stopPropagation()
              void handleSubmit(onSubmit)(event)
            }}
            noValidate
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex shrink-0 items-start justify-between pb-4">
              <div>
                <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  Despensa
                </p>
                <DialogTitle className="mt-1 text-2xl">Nuevo Insumo</DialogTitle>
                <DialogDescription className="sr-only">
                  Cargá el nombre, la unidad de medida y el costo unitario del nuevo insumo para sumarlo a la receta.
                </DialogDescription>
              </div>
              <DialogClose
                disabled={isSubmitting}
                aria-label="Cerrar nuevo insumo"
                className={cn(
                  'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full p-2 text-gray-400 transition hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                <X className="size-5" aria-hidden="true" />
              </DialogClose>
            </div>

            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <p>{submitError}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="quick-ingredient-name"
                  className="block text-xs font-bold text-gray-600 dark:text-gray-300"
                >
                  Nombre del insumo
                </label>
                <input
                  id="quick-ingredient-name"
                  {...nameField}
                  ref={(element) => {
                    nameFieldRef(element)
                    nameRef.current = element
                  }}
                  placeholder="Ej. Harina 0000"
                  aria-invalid={errors.name ? 'true' : 'false'}
                  aria-describedby={errors.name ? 'quick-ingredient-name-error' : undefined}
                  className={cn(
                    'mt-2 h-12 w-full rounded-2xl border bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:bg-white dark:bg-gray-800 dark:focus:bg-gray-800 dark:text-white dark:placeholder-gray-500',
                    CANONICAL_FOCUS_CLASSES,
                    errors.name
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-rose-500/70'
                      : 'border-gray-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 dark:border-gray-700 dark:focus:border-indigo-500'
                  )}
                />
                {errors.name && (
                  <p id="quick-ingredient-name-error" role="alert" className="mt-1 text-xs font-bold text-rose-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <span
                  id="quick-ingredient-unit-label"
                  className="mb-2 block text-xs font-bold text-gray-600 dark:text-gray-300"
                >
                  Unidad de medida
                </span>
                <div role="group" aria-labelledby="quick-ingredient-unit-label" className="flex flex-wrap gap-2">
                  {ingredientUnits.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      aria-pressed={selectedUnit === unit}
                      onClick={() => setValue('unit', unit, { shouldValidate: true, shouldDirty: true })}
                      className={cn(
                        'min-h-11 cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-bold transition',
                        CANONICAL_FOCUS_CLASSES,
                        selectedUnit === unit
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
                {errors.unit && (
                  <p role="alert" className="mt-1 text-xs font-bold text-rose-500">
                    {errors.unit.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="quick-ingredient-cost"
                  className="block text-xs font-bold text-gray-600 dark:text-gray-300"
                >
                  Costo unitario ({selectedUnit || 'kg'})
                </label>
                <div className="mt-2 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800">
                  <span className="text-lg font-bold text-gray-400" aria-hidden="true">$</span>
                  <input
                    id="quick-ingredient-cost"
                    {...costField}
                    onKeyDown={handleDecimalARKeyDown}
                    onChange={(event) => {
                      const clean = sanitizeDecimalAR(event.target.value)
                      setValue('currentCost', clean, { shouldValidate: true, shouldDirty: true })
                    }}
                    onBlur={(event) => {
                      void onRegisterCostBlur(event)
                      const parsed = parseNumeroAR(event.target.value)
                      if (parsed !== '') {
                        setValue('currentCost', formatNumeroAR(parsed), { shouldValidate: true })
                      }
                    }}
                    inputMode="decimal"
                    type="text"
                    placeholder="0,00"
                    aria-invalid={errors.currentCost ? 'true' : 'false'}
                    aria-describedby={errors.currentCost ? 'quick-ingredient-cost-error' : undefined}
                    className={cn(
                      'no-spinners w-full bg-transparent px-2 text-lg font-bold text-gray-900 outline-none dark:text-white dark:placeholder-gray-500',
                      CANONICAL_FOCUS_CLASSES
                    )}
                  />
                </div>
                {errors.currentCost && (
                  <p id="quick-ingredient-cost-error" role="alert" className="mt-1 text-xs font-bold text-rose-500">
                    {errors.currentCost.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex shrink-0 gap-3 pt-2">
              <DialogClose
                disabled={isSubmitting}
                className={cn(
                  'min-h-11 flex-1 cursor-pointer rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                Cancelar
              </DialogClose>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50',
                  CANONICAL_FOCUS_CLASSES
                )}
              >
                {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? 'Guardando...' : 'Crear Insumo'}
              </button>
            </div>
          </form>
        </DialogSheet>
      </DialogPortal>
    </Dialog>
  )
}