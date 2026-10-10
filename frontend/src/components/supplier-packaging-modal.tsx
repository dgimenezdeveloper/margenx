'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import {
  Calculator,
  ChevronDown,
  LoaderCircle,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react'
import {
  supplierPackagingSchema,
  type SupplierPackagingFormValues,
} from '@/schemas/supplierPackagingSchema'
import { supplierService, type Supplier, type SupplierIngredient } from '@/services/supplierService'
import type { Ingredient } from '@/services/ingredientService'
import { handleNumericKeyDown, sanitizeDecimal } from '@/lib/numericInput'
import { ApiError } from '@/services/api'

interface SupplierPackagingModalProps {
  isOpen: boolean
  onClose: () => void
  ingredient: Ingredient
  existingConnection?: SupplierIngredient
  onSuccess: (newUnitCost?: number, connection?: SupplierIngredient) => void
}

const money = (val: number) =>
  `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function SupplierPackagingModal({
  isOpen,
  onClose,
  ingredient,
  existingConnection,
  onSuccess,
}: SupplierPackagingModalProps) {
  const { getToken } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const [isAddingQuickSupplier, setIsAddingQuickSupplier] = useState(false)
  const [quickSupplierName, setQuickSupplierName] = useState('')
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false)

  const normalizedBaseUnit = useMemo<'kg' | 'l' | 'u'>(() => {
    const raw = ingredient.unit.toLowerCase()
    if (raw === 'litro' || raw === 'l') return 'l'
    if (raw === 'unidad' || raw === 'u') return 'u'
    return 'kg'
  }, [ingredient.unit])

  const unitReadableLabel = useMemo(() => {
    if (normalizedBaseUnit === 'l') return 'litro'
    if (normalizedBaseUnit === 'u') return 'unidad'
    return 'kilo'
  }, [normalizedBaseUnit])

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof supplierPackagingSchema>, undefined, SupplierPackagingFormValues>({
    resolver: zodResolver(supplierPackagingSchema),
    defaultValues: {
      supplierId: existingConnection?.supplierId || '',
      packageSize: existingConnection ? String(existingConnection.packageSize) : '',
      packageUnit: existingConnection ? (existingConnection.packageUnit as 'kg' | 'l' | 'u') : normalizedBaseUnit,
      packagePrice: existingConnection ? String(existingConnection.packagePrice) : '',
      isDefault: existingConnection?.isDefault || false,
    },
  })

  const watchedSize = useWatch({ control, name: 'packageSize' })
  const watchedPrice = useWatch({ control, name: 'packagePrice' })
  const watchedIsDefault = useWatch({ control, name: 'isDefault' })

  const handleClose = () => {
    setErrorBanner(null)
    setIsLoadingSuppliers(true)
    setIsAddingQuickSupplier(false)
    setQuickSupplierName('')
    reset({
      supplierId: existingConnection?.supplierId || '',
      packageSize: existingConnection ? String(existingConnection.packageSize) : '',
      packageUnit: existingConnection ? (existingConnection.packageUnit as 'kg' | 'l' | 'u') : normalizedBaseUnit,
      packagePrice: existingConnection ? String(existingConnection.packagePrice) : '',
      isDefault: existingConnection?.isDefault || false,
    })
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      reset({
        supplierId: existingConnection?.supplierId || '',
        packageSize: existingConnection ? String(existingConnection.packageSize) : '',
        packageUnit: existingConnection ? (existingConnection.packageUnit as 'kg' | 'l' | 'u') : normalizedBaseUnit,
        packagePrice: existingConnection ? String(existingConnection.packagePrice) : '',
        isDefault: existingConnection?.isDefault || false,
      })
    }
  }, [isOpen, existingConnection, normalizedBaseUnit, reset])

  useEffect(() => {
    if (!isOpen) return
    let active = true

    supplierService
      .getAll(getToken)
      .then((data) => {
        if (!active) return
        setSuppliers(data)
        if (data.length > 0 && !existingConnection) {
          setValue('supplierId', data[0].id)
        }
      })
      .catch(() => {
        if (active) setErrorBanner('No se pudo cargar la lista de proveedores.')
      })
      .finally(() => {
        if (active) setIsLoadingSuppliers(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, getToken, setValue, existingConnection])

  const numericSize = Number(watchedSize) || 0
  const numericPrice = Number(watchedPrice) || 0

  const calculatedUnitCost = useMemo(() => {
    if (numericSize > 0 && numericPrice > 0) {
      return numericPrice / numericSize
    }
    return null
  }, [numericSize, numericPrice])

  const costDifference = useMemo(() => {
    if (calculatedUnitCost === null) return null
    const diff = calculatedUnitCost - ingredient.currentCost
    const percentDiff =
      ingredient.currentCost > 0 ? (diff / ingredient.currentCost) * 100 : 0
    return {
      amount: diff,
      percent: percentDiff,
      isSaving: diff < 0,
      isEqual: Math.abs(diff) < 0.001,
    }
  }, [calculatedUnitCost, ingredient.currentCost])

  const handleQuickCreateSupplier = async () => {
    const trimmed = quickSupplierName.trim()
    if (!trimmed) return

    try {
      setIsCreatingSupplier(true)
      const created = await supplierService.create(getToken, { name: trimmed })
      setSuppliers((prev) => [...prev, created])
      setValue('supplierId', created.id, { shouldValidate: true })
      setQuickSupplierName('')
      setIsAddingQuickSupplier(false)
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof ApiError ? err.message : 'No se pudo crear el proveedor.'
      )
    } finally {
      setIsCreatingSupplier(false)
    }
  }

  const onSubmit = async (data: SupplierPackagingFormValues) => {
    try {
      setIsSubmitting(true)
      setErrorBanner(null)

      const result = await supplierService.addPackaging(getToken, data.supplierId, {
        ingredientId: ingredient.id,
        packageSize: data.packageSize,
        packageUnit: normalizedBaseUnit,
        packagePrice: data.packagePrice,
        isDefault: data.isDefault,
      })

      const finalCost =
        typeof result.unitCost === 'number'
          ? result.unitCost
          : Number(result.unitCost)

      const selectedSupplier = suppliers.find(s => s.id === data.supplierId)
      const newConnection: SupplierIngredient = {
        ...result.supplierIngredient,
        supplier: selectedSupplier ? { id: selectedSupplier.id, name: selectedSupplier.name } : undefined
      }

      onSuccess(data.isDefault ? finalCost : undefined, newConnection)
      handleClose()
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof ApiError
          ? err.message
          : 'No se pudo vincular la presentación del proveedor.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center bg-black/50 backdrop-blur-xs md:items-center animate-in fade-in">
      <div className="fixed inset-0" onClick={handleClose} />

      <section
        role="dialog"
        aria-labelledby="packaging-modal-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl border border-transparent bg-white p-6 shadow-2xl md:rounded-3xl dark:border-gray-800 dark:bg-gray-900 animate-in slide-in-from-bottom md:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />

        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Truck className="size-3.5" />
              <span>Compras Mayoristas</span>
            </div>
            <h2
              id="packaging-modal-title"
              className="mt-1 text-lg font-bold text-gray-900 dark:text-white truncate max-w-64 sm:max-w-72"
            >
              {ingredient.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex size-10 min-h-11 min-w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {errorBanner && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {errorBanner}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="supplier-select"
                className="text-xs font-bold text-gray-700 dark:text-gray-300"
              >
                Proveedor mayorista
              </label>
              {!isAddingQuickSupplier && !existingConnection && (
                <button
                  type="button"
                  onClick={() => setIsAddingQuickSupplier(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="size-3" /> Nuevo
                </button>
              )}
            </div>

            {isAddingQuickSupplier ? (
              <div className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-2 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <input
                  type="text"
                  value={quickSupplierName}
                  onChange={(e) => setQuickSupplierName(e.target.value)}
                  placeholder="Nombre del proveedor..."
                  autoFocus
                  className="min-h-11 h-11 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleQuickCreateSupplier}
                  disabled={isCreatingSupplier || !quickSupplierName.trim()}
                  className="min-h-11 h-11 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingSupplier ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    'Guardar'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingQuickSupplier(false)}
                  className="min-h-11 h-11 rounded-xl p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : isLoadingSuppliers ? (
              <div className="flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 text-xs font-semibold text-gray-400 dark:border-gray-700 dark:bg-gray-800">
                <LoaderCircle className="size-4 animate-spin mr-2" /> Cargando proveedores...
              </div>
            ) : suppliers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-3.5 text-center dark:border-gray-800">
                <p className="text-xs text-gray-500">No tienes proveedores registrados.</p>
                <button
                  type="button"
                  onClick={() => setIsAddingQuickSupplier(true)}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                >
                  + Agregar primer proveedor
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="supplier-select"
                  {...register('supplierId')}
                  disabled={!!existingConnection}
                  className="min-h-11 h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50 px-4 pr-10 text-xs font-bold text-gray-900 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:bg-gray-800 dark:focus:ring-2 dark:focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {suppliers.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
                    >
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-300" />
              </div>
            )}
            {errors.supplierId && (
              <p className="mt-1 text-xs font-bold text-rose-500">
                {errors.supplierId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="package-size-input"
                className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1"
              >
                Tamaño del bulto
              </label>
              <input
                id="package-size-input"
                {...register('packageSize')}
                onKeyDown={handleNumericKeyDown}
                onChange={(e) => {
                  const clean = sanitizeDecimal(e.target.value)
                  setValue('packageSize', clean, {
                    shouldValidate: true,
                  })
                }}
                inputMode="decimal"
                type="text"
                placeholder="Ej. 25"
                className="no-spinners min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:bg-gray-800 dark:focus:ring-2 dark:focus:ring-indigo-500/20"
              />
              {errors.packageSize && (
                <p className="mt-1 text-[11px] font-bold text-rose-500">
                  {errors.packageSize.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="package-unit-display"
                className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1"
              >
                Unidad base
              </label>
              <div
                id="package-unit-display"
                className="flex min-h-11 h-12 items-center justify-between rounded-2xl border border-gray-200 bg-gray-100 px-4 text-xs font-black text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <span>{normalizedBaseUnit.toUpperCase()}</span>
                <span className="text-[10px] text-gray-400 font-semibold">
                  ({unitReadableLabel}s)
                </span>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="package-price-input"
              className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1"
            >
              Precio total del bulto ($)
            </label>
            <div className="flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20">
              <span className="text-base font-bold text-gray-400 mr-2">$</span>
              <input
                id="package-price-input"
                {...register('packagePrice')}
                onKeyDown={handleNumericKeyDown}
                onChange={(e) => {
                  const clean = sanitizeDecimal(e.target.value)
                  setValue('packagePrice', clean, {
                    shouldValidate: true,
                  })
                }}
                inputMode="decimal"
                type="text"
                placeholder="0.00"
                className="no-spinners w-full bg-transparent text-sm font-bold text-gray-900 outline-none dark:text-white"
              />
            </div>
            {errors.packagePrice && (
              <p className="mt-1 text-[11px] font-bold text-rose-500">
                {errors.packagePrice.message}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-1.5">
              <Calculator className="size-4" />
              <span className="text-xs font-black uppercase tracking-wider">
                Calculadora de Equivalencia
              </span>
            </div>

            {calculatedUnitCost !== null ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Costo equivalente por {unitReadableLabel}:
                  </span>
                  <span className="text-base font-black text-indigo-950 dark:text-white">
                    {money(calculatedUnitCost)} / {normalizedBaseUnit}
                  </span>
                </div>

                {costDifference && (
                  <div className="flex items-center justify-between border-t border-indigo-200/50 pt-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      Costo actual en recetas: {money(ingredient.currentCost)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                        costDifference.isSaving
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : costDifference.isEqual
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      {costDifference.isSaving ? (
                        <>
                          <TrendingDown className="size-3" />
                          Ahorro {Math.abs(costDifference.percent).toFixed(1)}%
                        </>
                      ) : costDifference.isEqual ? (
                        'Mismo costo'
                      ) : (
                        <>
                          <TrendingUp className="size-3" />
                          +{costDifference.percent.toFixed(1)}%
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ingresa el tamaño del bulto y su precio para calcular el costo por{' '}
                {unitReadableLabel} automáticamente.
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3.5 cursor-pointer dark:border-gray-800 dark:bg-gray-800/40">
            <input
              type="checkbox"
              {...register('isDefault')}
              className="mt-0.5 size-4 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="text-xs">
              <span className="font-bold text-gray-900 dark:text-white">
                Marcar como proveedor predeterminado
              </span>
              <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                {watchedIsDefault
                  ? `Se actualizará el costo unitario de "${ingredient.name}" al valor calculado (${
                      calculatedUnitCost !== null
                        ? money(calculatedUnitCost)
                        : '$0.00'
                    }) y se recalcularán los productos.`
                  : 'Registra la presentación sin modificar el costo activo de recetas.'}
              </p>
            </div>
          </label>

          <div className="mt-6 flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 flex-1 cursor-pointer rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || suppliers.length === 0}
              className="min-h-11 flex-1 cursor-pointer rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isSubmitting ? 'Guardando...' : existingConnection ? 'Actualizar Empaque' : 'Asociar Empaque'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}