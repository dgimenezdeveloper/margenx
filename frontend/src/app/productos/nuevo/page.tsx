'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  ChevronDown,
  Info,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import ToastAlert from '@/components/ToastAlert'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { productSchema, type ProductFormValues } from '@/schemas/productSchema'
import { ApiError } from '@/services/api'
import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { productService } from '@/services/productService'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useRecipeStore, type RecipeState } from '@/stores/useRecipeStore'
import { handleNumericKeyDown, sanitizeDecimal } from '@/lib/numericInput'

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

function getAvailableRecipeUnits(baseUnit: string): string[] {
  if (baseUnit === 'kg') return ['gr', 'kg']
  if (baseUnit === 'litro' || baseUnit === 'l') return ['ml', 'litro']
  return [baseUnit || 'unidad']
}

function convertToBaseQty(qty: number, selectedUnit: string, baseUnit: string): number {
  if (baseUnit === 'kg' && selectedUnit === 'gr') return qty / 1000
  if ((baseUnit === 'litro' || baseUnit === 'l') && selectedUnit === 'ml') return qty / 1000
  return qty
}

function convertToRecipeUnitQty(baseQty: number, selectedUnit: string, baseUnit: string): number {
  if (baseUnit === 'kg' && selectedUnit === 'gr') return baseQty * 1000
  if ((baseUnit === 'litro' || baseUnit === 'l') && selectedUnit === 'ml') return baseQty * 1000
  return baseQty
}

export default function NewProductPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { defaultMinMarginPercent, isLoading: isLoadingUser } = useCurrentUser()

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLockRef = useRef(false)
  // Flag defensivo para silenciar el blocker durante el redirect post-guardado
  const isNavigatingAfterSaveRef = useRef(false)

  // Estado del botón activo en la botonera de ajuste rápido (+5%, +10%, target)
  const [activeStrategy, setActiveStrategy] = useState<'5' | '10' | 'target'>('target')

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
  }

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(id)
  }, [toast])

  const [supplies, setSupplies] = useState<Ingredient[]>([])
  const [isLoadingSupplies, setIsLoadingSupplies] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>('')
  const [recipeUnit, setRecipeUnit] = useState('gr')
  const [inputQty, setInputQty] = useState('100')

  const items = useRecipeStore((s: RecipeState) => s.items)
  const addIngredient = useRecipeStore((s: RecipeState) => s.addIngredient)
  const removeIngredient = useRecipeStore((s: RecipeState) => s.removeIngredient)
  const updateQuantity = useRecipeStore((s: RecipeState) => s.updateQuantity)
  const setSalePrice = useRecipeStore((s: RecipeState) => s.setSalePrice)
  const setMinMarginPercent = useRecipeStore((s: RecipeState) => s.setMinMarginPercent)
  const resetStore = useRecipeStore((s: RecipeState) => s.reset)

  const totalCost = useRecipeStore((s: RecipeState) => s.totalCost())
  const marginAmount = useRecipeStore((s: RecipeState) => s.marginAmount())
  const marginPercent = useRecipeStore((s: RecipeState) => s.marginPercent())
  const isUnderMargin = useRecipeStore((s: RecipeState) => s.isUnderMargin())

  const hasCriticalMargin = marginPercent < -100
  const hasHealthyMargin = marginPercent > 100

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof productSchema>, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: { name: '', salePrice: '', minMarginPercent: '30' },
  })

  // Considera "sucio" si el form tiene cambios o la receta tiene items, silenciado al enviar o redirigir
  const hasUnsavedChanges =
    (isDirty || items.length > 0) && !isSubmitting && !isNavigatingAfterSaveRef.current

  // Bloquea el scroll del body cuando el dropdown de insumos está desplegado
  useBodyScrollLock(isDropdownOpen)

  // Protección contra pérdida de datos por navegación accidental
  const { showDialog, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning(hasUnsavedChanges)

  const watchedSalePrice = useWatch({ control, name: 'salePrice' })
  const watchedMinMargin = useWatch({ control, name: 'minMarginPercent' })

  const targetMargin = Number(watchedMinMargin) || defaultMinMarginPercent || 30

  useEffect(() => {
    if (!isLoadingUser && defaultMinMarginPercent !== undefined) {
      setValue('minMarginPercent', String(defaultMinMarginPercent), { shouldValidate: true })
      setMinMarginPercent(defaultMinMarginPercent)
    }
  }, [defaultMinMarginPercent, isLoadingUser, setValue, setMinMarginPercent])

  useEffect(() => {
    setSalePrice(Number(watchedSalePrice) || 0)
  }, [watchedSalePrice, setSalePrice])

  useEffect(() => {
    setMinMarginPercent(Number(watchedMinMargin) || 0)
  }, [watchedMinMargin, setMinMarginPercent])

  useEffect(() => {
    resetStore()
    ingredientService
      .getAll(getToken)
      .then((data) => {
        setSupplies(data)
        if (data.length > 0 && data[0]) {
          setSelectedSupplyId(data[0].id)
          const units = getAvailableRecipeUnits(data[0].unit)
          setRecipeUnit(units[0] || 'kg')
        }
      })
      .catch((err: unknown) => {
        notify(err instanceof ApiError ? err.message : 'No se pudieron cargar los insumos.', 'error')
      })
      .finally(() => setIsLoadingSupplies(false))

    return () => {
      resetStore()
    }
  }, [getToken, resetStore])

  const selectedSupply = useMemo(
    () => supplies.find((s) => s.id === selectedSupplyId) ?? supplies[0],
    [supplies, selectedSupplyId]
  )

  const availableUnits = useMemo(
    () => (selectedSupply ? getAvailableRecipeUnits(selectedSupply.unit) : ['kg']),
    [selectedSupply]
  )

  const filteredSupplies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return supplies
    return supplies.filter((s) => s.name.toLowerCase().includes(q))
  }, [supplies, searchQuery])

  const handleSelectSupply = (supply: Ingredient) => {
    setSelectedSupplyId(supply.id)
    const units = getAvailableRecipeUnits(supply.unit)
    setRecipeUnit(units[0] || supply.unit)
    setInputQty(units[0] === 'gr' ? '100' : units[0] === 'ml' ? '100' : '1')
    setIsDropdownOpen(false)
    setSearchQuery('')
  }

  const handleAddIngredient = () => {
    const num = Number(inputQty)
    if (!selectedSupply || num <= 0) return

    const baseQty = convertToBaseQty(num, recipeUnit, selectedSupply.unit)

    addIngredient({
      ingredientId: selectedSupply.id,
      name: selectedSupply.name,
      unit: selectedSupply.unit,
      unitCost: selectedSupply.currentCost,
      quantity: baseQty,
      recipeUnit,
      inputQty: num,
    })

    notify(`"${selectedSupply.name}" agregado a la receta`)
    setInputQty(recipeUnit === 'gr' ? '100' : recipeUnit === 'ml' ? '100' : '1')
  }

  const handleItemQuantityChange = (ingredientId: string, rawVal: string) => {
    const targetItem = items.find((i: { ingredientId: string }) => i.ingredientId === ingredientId)
    if (!targetItem) return

    const val = Number(rawVal)
    if (val >= 0) {
      const activeUnit = targetItem.recipeUnit ?? targetItem.unit
      const baseQty = convertToBaseQty(val, activeUnit, targetItem.unit)
      updateQuantity(ingredientId, baseQty, val, activeUnit)
    }
  }

  const handleRemoveItem = (ingredientId: string, itemName: string) => {
    removeIngredient(ingredientId)
    notify(`"${itemName}" eliminado de la receta`)
  }

  const applySuggestedMargin = (percentage: number) => {
    if (items.length === 0 || totalCost <= 0) return
    const factor = percentage < 100 ? 1 - percentage / 100 : 0.5
    const suggested = Math.round(totalCost / factor)
    setValue('salePrice', String(suggested), { shouldValidate: true })
    setActiveStrategy('target')
  }

  const adjustPriceFactor = (factor: number, strategy: '5' | '10') => {
    const currentSale = Number(watchedSalePrice) || 0
    if (currentSale > 0) {
      setValue('salePrice', String(Math.round(currentSale * factor)), { shouldValidate: true })
    } else if (totalCost > 0) {
      setValue('salePrice', String(Math.round(totalCost * factor)), { shouldValidate: true })
    }
    setActiveStrategy(strategy)
  }

  const handleSaveProduct = async (data: ProductFormValues) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setIsSubmitting(true)

    const payload = {
      name: data.name,
      salePrice: Number(data.salePrice),
      minMarginPercent: Number(data.minMarginPercent),
      ingredients: items.map((item: { ingredientId: string; quantity: number }) => ({
        ingredientId: item.ingredientId,
        quantity: Number(item.quantity),
      })),
    }

    try {
      await productService.create(getToken, payload)

      notify(
        items.length === 0
          ? 'Producto guardado en estado borrador (Sin Receta).'
          : 'Producto creado exitosamente con receta vinculada.'
      )
      isNavigatingAfterSaveRef.current = true
      reset({ name: '', salePrice: '', minMarginPercent: '30' })
      resetStore()
      setTimeout(() => router.push('/productos'), 800)
    } catch (error: unknown) {
      isNavigatingAfterSaveRef.current = false
      if (error instanceof ApiError) {
        const field =
          error.status === 409
            ? 'name'
            : error.status === 400
              ? (() => {
                  const msg = error.message.toLowerCase()
                  if (msg.includes('name') || msg.includes('nombre')) return 'name'
                  if (msg.includes('saleprice') || msg.includes('precio')) return 'salePrice'
                  if (msg.includes('minmarginpercent') || msg.includes('margen')) return 'minMarginPercent'
                  return null
                })()
              : null

        if (field) {
          setError(field, { type: 'server', message: error.message })
        }
        notify(error.message, 'error')
      } else {
        notify('Error al guardar el producto.', 'error')
      }
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  const previewNumericQty = Number(inputQty) || 0
  const previewBaseQty = selectedSupply
    ? convertToBaseQty(previewNumericQty, recipeUnit, selectedSupply.unit)
    : 0
  const previewSubtotal = selectedSupply ? previewBaseQty * selectedSupply.currentCost : 0

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-44 pt-5 text-gray-900 md:px-8 md:pb-16 lg:px-12 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <ToastAlert
          key={`${toast.type}-${toast.message}`}
          message={toast.message}
          type={toast.type}
        />
      )}

      <form onSubmit={handleSubmit(handleSaveProduct)} noValidate>
        <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl">
          <Navbar title="Nuevo Producto" backHref="/productos" />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className="space-y-6 lg:col-span-7">
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">1. Datos Básicos</h2>
                  <span className="text-xs text-gray-400 font-medium">Información comercial</span>
                </div>

                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                  Nombre del producto
                  <input
                    {...register('name')}
                    placeholder="Ej. Medialunas de manteca — docena / Pan flauta 1kg"
                    className="mt-2 min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800 dark:focus:ring-2 dark:focus:ring-indigo-500/20"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs font-bold text-rose-500">{errors.name.message}</p>
                  )}
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                      <span>Precio de Venta</span>
                      <div className="mt-2 flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20">
                        <span className="font-bold text-gray-400">$</span>
                        <input
                          {...register('salePrice')}
                          onKeyDown={handleNumericKeyDown}
                          onChange={(e) => {
                            const clean = sanitizeDecimal(e.target.value)
                            setValue('salePrice', clean, { shouldValidate: true, shouldDirty: true })
                            setActiveStrategy('target')
                          }}
                          inputMode="decimal"
                          type="text"
                          placeholder="0.00"
                          className="no-spinners w-full bg-transparent px-2 text-base font-bold text-gray-900 outline-none dark:text-white dark:placeholder-gray-500"
                        />
                      </div>
                    </label>
                    {errors.salePrice && (
                      <p className="mt-1 text-xs font-bold text-rose-500">{errors.salePrice.message}</p>
                    )}
                    <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      Separador decimal con punto (ej: 1250.50).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                      <span>Margen Mínimo (%)</span>
                      <div className="mt-2 flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20">
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
                          className="no-spinners w-full bg-transparent text-right font-bold text-gray-900 outline-none dark:text-white dark:placeholder-gray-500"
                        />
                        <span className="ml-1 font-bold text-gray-400">%</span>
                      </div>
                    </label>
                    {errors.minMarginPercent && (
                      <p className="mt-1 text-xs font-bold text-rose-500">
                        {errors.minMarginPercent.message}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      Margen personalizado para este producto.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl bg-indigo-50/70 p-3 text-xs text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/60">
                  <Info className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <p className="leading-tight">
                    <strong>Margen Inicial:</strong> Se aplicó automáticamente tu margen global de <strong>{defaultMinMarginPercent}%</strong>. Podés ajustarlo exclusivamente para este producto sin alterar el resto.
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">2. Composición / Receta</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Sumá insumos con cantidades dinámicas para costear la elaboración.
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {items.length} {items.length === 1 ? 'insumo' : 'insumos'}
                  </span>
                </div>

                <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
                    Seleccionar Insumo de la Despensa
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={isLoadingSupplies || supplies.length === 0}
                    className="flex min-h-11 h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-bold text-gray-900 shadow-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <span className="truncate">
                      {selectedSupply
                        ? `${selectedSupply.name} (${money(selectedSupply.currentCost)}/${selectedSupply.unit})`
                        : 'Buscar insumo...'}
                    </span>
                    <ChevronDown
                      className={`size-4 text-gray-400 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute inset-x-4 top-20 z-30 mt-1 max-h-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-150">
                      <div className="sticky top-0 border-b border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-950">
                        <div className="relative flex items-center">
                          <Search className="pointer-events-none absolute left-3 size-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filtrar por nombre..."
                            autoFocus
                            className="min-h-10 h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2 p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 p-1 dark:divide-gray-800">
                        {filteredSupplies.length === 0 ? (
                          <div className="p-4 text-center text-xs font-semibold text-gray-400">
                            No se encontraron insumos con ese nombre.
                          </div>
                        ) : (
                          filteredSupplies.map((supply) => (
                            <button
                              key={supply.id}
                              type="button"
                              onClick={() => handleSelectSupply(supply)}
                              className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer ${
                                supply.id === selectedSupplyId
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                  : 'text-gray-800 dark:text-gray-200'
                              }`}
                            >
                              <span className="truncate">{supply.name}</span>
                              <span className="ml-2 shrink-0 text-gray-400">
                                {money(supply.currentCost)}/{supply.unit}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3.5 flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                        Cantidad utilizada
                      </label>
                      <input
                        value={inputQty}
                        onKeyDown={handleNumericKeyDown}
                        onChange={(e) => setInputQty(sanitizeDecimal(e.target.value))}
                        placeholder="100"
                        inputMode="decimal"
                        type="text"
                        className="no-spinners min-h-11 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="w-28 sm:w-36">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                        Unidad
                      </label>
                      <select
                        value={recipeUnit}
                        onChange={(e) => setRecipeUnit(e.target.value)}
                        className="min-h-11 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
                      >
                        {availableUnits.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedSupply && previewNumericQty > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50/80 p-3 text-xs font-semibold text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200">
                      <span>
                        Equivalencia: <strong>{previewNumericQty} {recipeUnit}</strong> ({previewBaseQty} {selectedSupply.unit})
                      </span>
                      <span>Subtotal: <strong className="font-extrabold text-indigo-700 dark:text-indigo-300">{money(previewSubtotal)}</strong></span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    disabled={isLoadingSupplies || !selectedSupply || previewNumericQty <= 0}
                    className="mt-3.5 flex min-h-11 h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingSupplies ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Agregar Insumo a la Receta
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400 dark:border-gray-800">
                    Aún no has sumado insumos a esta receta. El producto se guardará como borrador ("Sin Receta").
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/50 p-2 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/40">
                    {items.map((item: { ingredientId: string; quantity: number; unitCost: number; name: string; inputQty?: number; recipeUnit?: string; unit: string }) => {
                      const itemSubtotal = item.quantity * item.unitCost
                      const displayQty =
                        item.inputQty ??
                        convertToRecipeUnitQty(
                          item.quantity,
                          item.recipeUnit ?? item.unit,
                          item.unit
                        )

                      return (
                        <div
                          key={item.ingredientId}
                          className="flex flex-col gap-2 p-3 transition sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <strong className="block text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                              {item.name}
                            </strong>
                            <p className="text-xs text-gray-400">
                              Costo base: {money(item.unitCost)} por {item.unit}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
                              <input
                                onKeyDown={handleNumericKeyDown}
                                onChange={(e) =>
                                  handleItemQuantityChange(item.ingredientId, sanitizeDecimal(e.target.value))
                                }
                                value={displayQty}
                                inputMode="decimal"
                                type="text"
                                aria-label={`Cantidad de ${item.name}`}
                                className="no-spinners min-h-9 w-16 text-right text-xs font-bold outline-none text-gray-900 dark:text-white bg-transparent"
                              />
                              <span className="text-xs font-bold text-gray-500">
                                {item.recipeUnit ?? item.unit}
                              </span>
                            </div>

                            <div className="text-right min-w-20">
                              <span className="block text-xs font-black text-gray-900 dark:text-gray-100">
                                {money(itemSubtotal)}
                              </span>
                              <span className="text-[10px] text-gray-400">subtotal</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.ingredientId, item.name)}
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 cursor-pointer"
                              title="Remover insumo"
                              aria-label={`Eliminar ${item.name}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-6">
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-800 dark:bg-gray-900 space-y-6">
                <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Simulador Financiero
                  </p>
                  <h3 className="text-xl font-black mt-1 text-gray-900 dark:text-white">Análisis de Rentabilidad</h3>
                </div>

                <div>
                  {items.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-gray-100 p-4 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      <span className="size-2.5 rounded-full bg-gray-400" />
                      Producto en modo borrador (Sin Receta).
                    </div>
                  ) : hasCriticalMargin ? (
                    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40 animate-in fade-in">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200/70 px-2.5 py-1 text-xs font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                          <AlertTriangle className="size-3.5" /> Margen Bajo
                        </span>
                        <span className="text-2xl font-black text-rose-700 dark:text-rose-300">
                          {marginPercent.toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-400">
                        ⚠️ Venta a pérdida: Estás perdiendo ${Math.abs(marginAmount).toLocaleString('es-AR')} por unidad.
                      </p>
                    </div>
                  ) : hasHealthyMargin ? (
                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40 animate-in fade-in">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/70 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          <ShieldCheck className="size-3.5" /> Margen Saludable
                        </span>
                        <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                          {marginPercent.toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Cumple o supera el objetivo de rentabilidad ({targetMargin}%).
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40 animate-in fade-in">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200/70 px-2.5 py-1 text-xs font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                          <AlertTriangle className="size-3.5" /> Margen Bajo
                        </span>
                        <span className="text-2xl font-black text-rose-700 dark:text-rose-300">
                          {marginPercent.toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-400">
                        El margen está por debajo del umbral personalizado ({Number(watchedMinMargin) || 0}%).
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Costo Total de Elaboración:</span>
                    <strong className="font-extrabold text-gray-900 dark:text-white">{money(totalCost)}</strong>
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

                {/* BOTONERA DE AJUSTES RÁPIDOS SIEMPRE VISIBLE CON ESTADO ACTIVO */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Ajustes Rápidos de Precio</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustPriceFactor(1.05, '5')}
                      className={`min-h-11 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                        activeStrategy === '5'
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      +5%
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPriceFactor(1.10, '10')}
                      className={`min-h-11 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                        activeStrategy === '10'
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      +10%
                    </button>
                    <button
                      type="button"
                      disabled={items.length === 0 || totalCost <= 0}
                      onClick={() => applySuggestedMargin(targetMargin)}
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="hidden lg:flex min-h-12 h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="fixed inset-x-0 bottom-[calc(3rem+max(0.75rem,env(safe-area-inset-bottom)))] md:bottom-0 z-10 border-t border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">Precio: <strong className="text-gray-900 dark:text-gray-100">{money(Number(watchedSalePrice) || 0)}</strong></span>
                <span className="text-gray-500 dark:text-gray-400">Ganancia: <strong className={marginAmount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{money(marginAmount)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                {items.length === 0 ? (
                  <span className="text-[11px] font-bold text-gray-500">Modo Borrador</span>
                ) : isUnderMargin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    <AlertTriangle className="size-3" /> Margen Bajo ({marginPercent}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <ShieldCheck className="size-3" /> Saludable ({marginPercent}%)
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-11 h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle className="size-3.5 mr-1.5 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </footer>
      </form>
      <BottomNav />

      {/* Diálogo de confirmación para cambios no guardados */}
      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </main>
  )
}