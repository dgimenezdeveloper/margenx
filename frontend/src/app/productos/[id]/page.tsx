'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  LoaderCircle,
  Package,
  Plus,
  Trash2,
  X,
  ShieldCheck,
  Save,
  ChevronDown,
  Search,
  Pencil,
} from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import ToastAlert from '@/components/ToastAlert'
import { EmptyState } from '@/components/empty-state'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { productSchema, type ProductFormValues } from '@/schemas/productSchema'
import { productService, type Product } from '@/services/productService'
import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { ApiError } from '@/services/api'
import { useRecipeStore, type RecipeState, type RecipeItem } from '@/stores/useRecipeStore'
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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const submitLockRef = useRef(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)

  // Estado del botón activo en la botonera de ajuste rápido (+5%, +10%, target)
  const [activeStrategy, setActiveStrategy] = useState<'5' | '10' | 'target'>('target')

  const [product, setProduct] = useState<Product | null>(null)
  const [availablePantry, setAvailablePantry] = useState<Ingredient[]>([])

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSupplyId, setSelectedSupplyId] = useState('')
  const [recipeUnit, setRecipeUnit] = useState('gr')
  const [inputQty, setInputQty] = useState('50')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Bloquea el scroll del body cuando un modal/bottom-sheet está abierto
  useBodyScrollLock(isSimulatorOpen || showDeleteModal || showAddModal)

  const items = useRecipeStore((s: RecipeState) => s.items)
  const setItems = useRecipeStore((s: RecipeState) => s.setItems)
  const addIngredient = useRecipeStore((s: RecipeState) => s.addIngredient)
  const removeIngredient = useRecipeStore((s: RecipeState) => s.removeIngredient)
  const updateQuantity = useRecipeStore((s: RecipeState) => s.updateQuantity)
  const setSalePrice = useRecipeStore((s: RecipeState) => s.setSalePrice)
  const setMinMarginPercent = useRecipeStore((s: RecipeState) => s.setMinMarginPercent)
  const resetStore = useRecipeStore((s: RecipeState) => s.reset)

  const cost = useRecipeStore((s: RecipeState) => s.totalCost())
  const margin = useRecipeStore((s: RecipeState) => s.marginPercent())
  const gain = useRecipeStore((s: RecipeState) => s.marginAmount())
  const isHealthy = useRecipeStore((s: RecipeState) => !s.isUnderMargin())

  const hasCriticalMargin = margin < -100
  const hasHealthyMargin = margin > 100

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
    window.setTimeout(() => setToast(null), 3000)
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof productSchema>, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: { name: '', salePrice: '', minMarginPercent: '30' },
  })

  const watchedSalePrice = useWatch({ control, name: 'salePrice' })
  const watchedMinMargin = useWatch({ control, name: 'minMarginPercent' })

  // Fix bloqueante: Se excluye isDeleting para que el borrado no dispare el diálogo
  const { showDialog, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning(
    isDirty && !isSaving && !isDeleting
  )

  useEffect(() => {
    setSalePrice(Number(watchedSalePrice) || 0)
  }, [watchedSalePrice, setSalePrice])

  useEffect(() => {
    setMinMarginPercent(Number(watchedMinMargin) || 0)
  }, [watchedMinMargin, setMinMarginPercent])

  useEffect(() => {
    if (!id) return

    let active = true
    Promise.all([
      productService.getById(id, getToken),
      ingredientService.getAll(getToken),
    ])
      .then(([prodData, ingredientsData]) => {
        if (!active) return
        setProduct(prodData)
        setAvailablePantry(ingredientsData)

        reset({
          name: prodData.name,
          salePrice: String(prodData.salePrice),
          minMarginPercent: String(prodData.minMarginPercent),
        })

        const mappedRecipe: RecipeItem[] = prodData.ingredients.map((pi) => ({
          ingredientId: pi.ingredientId,
          name: pi.ingredient?.name || 'Insumo desconocido',
          unit: pi.ingredient?.unit || 'u',
          recipeUnit: pi.ingredient?.unit || 'u',
          inputQty: Number(pi.quantity),
          quantity: Number(pi.quantity),
          unitCost: pi.ingredient?.currentCost || 0,
        }))

        setItems(mappedRecipe)
        setSalePrice(prodData.salePrice)
        setMinMarginPercent(prodData.minMarginPercent)

        if (ingredientsData.length > 0 && ingredientsData[0]) {
          setSelectedSupplyId(ingredientsData[0].id)
          setRecipeUnit(getAvailableRecipeUnits(ingredientsData[0].unit)[0] || 'kg')
        }
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Error al cargar el producto')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      resetStore()
    }
  }, [id, getToken, reset, setItems, setSalePrice, setMinMarginPercent, resetStore])

  const currentSupply = useMemo(
    () => availablePantry.find((p) => p.id === selectedSupplyId) || availablePantry[0],
    [availablePantry, selectedSupplyId]
  )

  const availableUnits = useMemo(
    () => (currentSupply ? getAvailableRecipeUnits(currentSupply.unit) : ['u']),
    [currentSupply]
  )

  const filteredSupplies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return availablePantry
    return availablePantry.filter((s) => s.name.toLowerCase().includes(q))
  }, [availablePantry, searchQuery])

  const hasRecipe = items.length > 0

  const parsedWatchedMargin = Number(watchedMinMargin)
  const targetMargin =
    watchedMinMargin !== '' && !isNaN(parsedWatchedMargin)
      ? parsedWatchedMargin
      : (product?.minMarginPercent != null ? Number(product.minMarginPercent) : 30)

  const applySuggestedMargin = (targetPercentage: number) => {
    if (!hasRecipe || cost <= 0) return
    const factor = targetPercentage < 100 ? 1 - targetPercentage / 100 : 0.5
    const suggestedPrice = Math.round(cost / factor)
    setValue('salePrice', String(suggestedPrice), { shouldValidate: true, shouldDirty: true })
    setActiveStrategy('target')
  }

  const adjustPriceFactor = (factor: number, strategy: '5' | '10') => {
    const sale = Number(watchedSalePrice) || 0
    if (sale <= 0 && cost > 0) {
      setValue('salePrice', String(Math.round(cost * factor)), {
        shouldValidate: true,
        shouldDirty: true,
      })
    } else if (sale > 0) {
      setValue('salePrice', String(Math.round(sale * factor)), {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
    setActiveStrategy(strategy)
  }

  const handleSelectSupply = (supply: Ingredient) => {
    setSelectedSupplyId(supply.id)
    const units = getAvailableRecipeUnits(supply.unit)
    setRecipeUnit(units[0] || supply.unit)
    setInputQty(units[0] === 'gr' ? '50' : units[0] === 'ml' ? '30' : '1')
    setIsDropdownOpen(false)
    setSearchQuery('')
  }

  const handleAddIngredient = async () => {
    const numQty = Number(inputQty)
    if (currentSupply && numQty > 0) {
      const baseQty = convertToBaseQty(numQty, recipeUnit, currentSupply.unit)
      const newItem: RecipeItem = {
        ingredientId: currentSupply.id,
        name: currentSupply.name,
        unit: currentSupply.unit,
        recipeUnit,
        inputQty: numQty,
        quantity: baseQty,
        unitCost: currentSupply.currentCost,
      }

      addIngredient(newItem)
      const updatedItems = useRecipeStore.getState().items as RecipeItem[]

      try {
        await productService.update(
          id!,
          {
            ingredients: updatedItems.map((r: RecipeItem) => ({
              ingredientId: r.ingredientId,
              quantity: r.quantity,
            })),
          },
          getToken
        )
        setShowAddModal(false)
        notify(`"${currentSupply.name}" sumado a la receta`)
      } catch {
        notify('Error al actualizar la receta')
      }
    }
  }

  const handleItemQuantityChange = async (ingredientId: string, rawVal: string) => {
    const targetItem = items.find((i: RecipeItem) => i.ingredientId === ingredientId)
    if (!targetItem) return

    const val = Number(rawVal)
    if (val >= 0) {
      const activeUnit = targetItem.recipeUnit ?? targetItem.unit
      const baseQty = convertToBaseQty(val, activeUnit, targetItem.unit)
      updateQuantity(ingredientId, baseQty, val, activeUnit)

      const updatedItems = useRecipeStore.getState().items as RecipeItem[]
      try {
        await productService.update(
          id!,
          {
            ingredients: updatedItems.map((r: RecipeItem) => ({
              ingredientId: r.ingredientId,
              quantity: r.quantity,
            })),
          },
          getToken
        )
      } catch {
        notify('Error al actualizar la cantidad')
      }
    }
  }

  const handleRemoveIngredient = async (ingredientId: string) => {
    removeIngredient(ingredientId)
    const updatedItems = useRecipeStore.getState().items as RecipeItem[]
    try {
      await productService.update(
        id!,
        {
          ingredients: updatedItems.map((r: RecipeItem) => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
          })),
        },
        getToken
      )
      notify('Insumo eliminado de la receta')
    } catch {
      notify('Error al actualizar la receta')
    }
  }

  const handleFormSubmit = async (data: ProductFormValues) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setIsSaving(true)

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
      const updated = await productService.update(id!, payload, getToken)
      setProduct(updated)
      reset({
        name: updated.name,
        salePrice: String(updated.salePrice),
        minMarginPercent: String(updated.minMarginPercent),
      })
      notify('Datos del producto guardados exitosamente', 'success')
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const field =
          err.status === 409
            ? 'name'
            : err.status === 400
              ? (() => {
                  const msg = err.message.toLowerCase()
                  if (msg.includes('name') || msg.includes('nombre')) return 'name'
                  if (msg.includes('saleprice') || msg.includes('precio')) return 'salePrice'
                  if (msg.includes('minmarginpercent') || msg.includes('margen')) return 'minMarginPercent'
                  return null
                })()
              : null

        if (field) {
          setError(field, { type: 'server', message: err.message })
        }
        notify(err.message, 'error')
      } else {
        notify('Error al guardar los cambios', 'error')
      }
    } finally {
      submitLockRef.current = false
      setIsSaving(false)
    }
  }

  const handleSavePriceFromSheet = async () => {
    await handleSubmit(async (data) => {
      await handleFormSubmit(data)
      setIsSimulatorOpen(false)
    })()
  }

  const handleDeleteProduct = async () => {
    try {
      setIsDeleting(true)
      await productService.delete(id!, getToken)
      notify('Producto eliminado correctamente.')
      setTimeout(() => navigate('/productos'), 600)
    } catch (err: unknown) {
      notify(err instanceof ApiError ? err.message : 'No se pudo eliminar el producto.')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pt-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl space-y-6">
          <div className="h-10 w-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="h-36 w-full animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-64 w-full animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-48 w-full animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="hidden lg:col-span-5 lg:block">
              <div className="h-96 w-full animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (loadError || !product) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pt-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl">
          <Navbar title="Producto no encontrado" backHref="/productos" />
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {loadError || 'El producto que buscas no existe o pertenece a otra cuenta.'}
          </div>
          <div className="mt-8">
            <EmptyState
              icon={<Package className="size-6" />}
              title="Ficha técnica inexistente"
              description="No pudimos encontrar los datos del producto solicitado."
              actionLabel="Volver al catálogo"
              onAction={() => navigate('/productos')}
            />
          </div>
        </div>
        <BottomNav />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-44 pt-5 text-gray-900 md:px-8 md:pb-16 lg:px-12 dark:bg-gray-950 dark:text-gray-100">
      {toast && <ToastAlert message={toast.message} type={toast.type} />}

      <div className="mx-auto flex w-full max-w-md flex-col gap-6 md:max-w-5xl lg:max-w-6xl">
        <Navbar title={product.name} backHref="/productos" />

        {!hasRecipe ? (
          <section className="rounded-3xl border-2 border-gray-200 bg-gray-100 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Estado del producto
            </p>
            <p className="mt-1 text-2xl font-black text-gray-700 dark:text-gray-300">
              Borrador (Sin Receta)
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Agrega materias primas para comenzar a calcular automáticamente el margen de ganancia.
            </p>
          </section>
        ) : hasCriticalMargin ? (
          <section className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm transition-all duration-300 dark:border-rose-900/60 dark:bg-rose-950/40">
            <div className="flex justify-between items-start gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200/70 px-2.5 py-1 text-xs font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                <AlertTriangle className="size-3.5" /> Margen Bajo
              </span>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                Objetivo: {targetMargin}%
              </span>
            </div>
            <p className="mt-2 text-5xl font-black tracking-tight text-rose-700 dark:text-rose-300">
              {margin}%
            </p>
            <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-400">
              ⚠️ Venta a pérdida: Estás perdiendo ${Math.abs(gain).toLocaleString('es-AR')} por unidad.
            </p>
          </section>
        ) : hasHealthyMargin || isHealthy ? (
          <section className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5 shadow-sm transition-all duration-300 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <div className="flex justify-between items-start gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/70 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="size-3.5" /> Margen Saludable
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Objetivo: {targetMargin}%
              </span>
            </div>
            <p className="mt-2 text-5xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
              {margin.toFixed(1)}%
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Cumple con el umbral personalizado ({targetMargin}%).
            </p>
          </section>
        ) : (
          <section className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm transition-all duration-300 dark:border-rose-900/60 dark:bg-rose-950/40">
            <div className="flex justify-between items-start gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200/70 px-2.5 py-1 text-xs font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                <AlertTriangle className="size-3.5" /> Margen Bajo
              </span>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                Objetivo: {targetMargin}%
              </span>
            </div>
            <p className="mt-2 text-5xl font-black tracking-tight text-rose-700 dark:text-rose-300">
              {margin.toFixed(1)}%
            </p>
            <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-400">
              Por debajo del mínimo ({targetMargin}%)
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-7">
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4"
              noValidate
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Datos del Producto</h2>
                {isDirty && (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Cambios sin guardar
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Nombre
                </label>
                <input
                  {...register('name')}
                  className="min-h-11 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800 dark:focus:ring-2 dark:focus:ring-indigo-500/20"
                />
                {errors.name && (
                  <p className="mt-1 text-xs font-bold text-rose-500">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    Precio de Venta ($)
                  </label>
                  <div className="flex min-h-11 h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20">
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
                      className="no-spinners w-full bg-transparent px-2 text-sm font-bold text-gray-900 outline-none dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                  {errors.salePrice && (
                    <p className="mt-1 text-xs font-bold text-rose-500">{errors.salePrice.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    Margen Mínimo (%)
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
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex min-h-11 h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Guardar Cambios
                </button>
              </div>
            </form>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Composición / Receta</h2>
                <span className="text-xs font-semibold text-gray-400">
                  {items.length} ingredientes
                </span>
              </div>

              {!hasRecipe ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400 dark:border-gray-800">
                  Sin insumos cargados. Suma ingredientes para costear el producto.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item: RecipeItem) => {
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
                        className="flex flex-col gap-2 py-3.5 transition sm:flex-row sm:items-center sm:justify-between"
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
                            onClick={() => handleRemoveIngredient(item.ingredientId)}
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

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 py-3 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50/50 dark:border-indigo-800 dark:text-indigo-400 cursor-pointer"
              >
                <Plus className="size-4" /> Agregar Insumo a la Receta
              </button>
            </section>

            <section className="rounded-3xl border border-rose-100 bg-rose-50/40 p-5 dark:border-rose-900/30 dark:bg-rose-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                    Eliminar este producto
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Se borrará la ficha técnica y todas sus relaciones en el catálogo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
                >
                  <Trash2 className="size-4" /> Eliminar Producto
                </button>
              </div>
            </section>
          </div>

          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-800 dark:bg-gray-900 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                    Simulador de Precio
                  </h3>
                  <p className="text-base font-black text-gray-900 dark:text-white mt-1">
                    Costo Total: {money(cost)}
                  </p>
                </div>
                <span
                  className={`text-sm font-black ${
                    !hasRecipe
                      ? 'text-gray-400 dark:text-gray-500'
                      : gain >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  Ganancia: {!hasRecipe ? '$0' : money(gain)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Ajustes Rápidos</label>
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
                    disabled={!hasRecipe || cost <= 0}
                    className={`min-h-11 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                      activeStrategy === 'target'
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-indigo-600 bg-transparent text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950'
                    }`}
                    onClick={() => applySuggestedMargin(targetMargin)}
                  >
                    Sugerir {targetMargin}%
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Precio de Venta</label>
                {/* Contenedor sin fondo blanco en Dark Mode */}
                <div className="flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20">
                  <span className="text-lg font-bold text-gray-400">$</span>
                  <input
                    value={watchedSalePrice == null ? '' : String(watchedSalePrice)}
                    onKeyDown={handleNumericKeyDown}
                    onChange={(e) => {
                      const clean = sanitizeDecimal(e.target.value)
                      setValue('salePrice', clean, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                      setActiveStrategy('target')
                    }}
                    inputMode="decimal"
                    type="text"
                    placeholder="0.00"
                    className="no-spinners w-full bg-transparent px-2 text-lg font-bold outline-none text-gray-900 dark:text-white dark:placeholder-gray-500"
                  />
                </div>
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
                  : `Proyección: Margen ${margin}% ${margin >= targetMargin ? '✅' : '⚠️'}`}
              </p>

              <button
                type="button"
                onClick={handleSubmit(handleFormSubmit)}
                disabled={isSaving}
                className="hidden lg:flex min-h-12 h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving && <LoaderCircle className="size-4 animate-spin" />}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-[calc(3rem+max(0.75rem,env(safe-area-inset-bottom)))] md:bottom-0 z-10 border-t border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">
                Precio: <strong className="text-gray-900 dark:text-gray-100">{money(Number(watchedSalePrice) || 0)}</strong>
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Ganancia: <strong className={gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{money(gain)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Costo: <strong className="text-gray-800 dark:text-gray-200">{money(cost)}</strong>
              </span>
              {!hasRecipe ? (
                <span className="text-[10px] font-bold text-gray-400">Sin Receta</span>
              ) : isHealthy ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck className="size-3" /> {margin}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <AlertTriangle className="size-3" /> {margin}%
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSimulatorOpen(true)}
            className="flex min-h-11 h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"
          >
            <Pencil className="size-3.5" /> Ajustar Precio
          </button>
        </div>
      </footer>

      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsSimulatorOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-transparent bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />

            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Simulador de Precio (Costo: {money(cost)})
                </p>
              </div>
              <span className={`text-sm font-black ${!hasRecipe ? 'text-gray-400' : gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                Ganancia: {!hasRecipe ? '$0' : money(gain)}
              </span>
            </div>

            <div className="mt-5 space-y-5">
              <div>
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
                    disabled={!hasRecipe || cost <= 0}
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

              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-2">Precio de Venta</label>
                {/* Contenedor sin fondo blanco en Dark Mode */}
                <div className="flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20">
                  <span className="text-lg font-bold text-gray-400">$</span>
                  <input
                    value={watchedSalePrice == null ? '' : String(watchedSalePrice)}
                    onKeyDown={handleNumericKeyDown}
                    onChange={(e) => {
                      const clean = sanitizeDecimal(e.target.value)
                      setValue('salePrice', clean, { shouldValidate: true, shouldDirty: true })
                      setActiveStrategy('target')
                    }}
                    inputMode="decimal"
                    type="text"
                    placeholder="0.00"
                    className="no-spinners w-full bg-transparent px-2 text-lg font-bold outline-none text-gray-900 dark:text-white dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <p className={`text-xs font-bold ${!hasRecipe ? 'text-gray-500 dark:text-gray-400' : margin >= targetMargin ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {!hasRecipe ? 'Proyección: 0.0% (Sin Receta)' : `Proyección: Nuevo margen ${margin}% ${margin >= targetMargin ? '✅' : '⚠️'}`}
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="min-h-11 flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePriceFromSheet}
                  disabled={isSaving}
                  className="min-h-11 flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Guardar Precio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => !isDeleting && setShowDeleteModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ¿Eliminar producto?
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Estás a punto de eliminar definitivamente <strong>{product.name}</strong>. Esta acción
              no se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteProduct}
                className="min-h-11 flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 transition"
              >
                {isDeleting && <LoaderCircle className="size-3.5 animate-spin" />}
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs md:items-center animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowAddModal(false)} />
          <section className="relative z-10 w-full max-w-md rounded-t-3xl border border-transparent bg-white p-6 shadow-2xl md:rounded-3xl dark:border-gray-800 dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">Despensa</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Sumar Insumo a la Receta</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                Seleccionar Insumo

                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="mt-2 flex min-h-11 h-12 w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 text-left text-sm font-bold text-gray-900 shadow-xs transition hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
                >
                  <span className="truncate">
                    {currentSupply
                      ? `${currentSupply.name} (${money(currentSupply.currentCost)}/${currentSupply.unit})`
                      : 'Buscar insumo...'}
                  </span>
                  <ChevronDown
                    className={`size-4 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </label>

              {isDropdownOpen && (
                <div className="absolute inset-x-6 top-32 z-30 mt-1 max-h-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 animate-in fade-in zoom-in-95 duration-150">
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

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Cantidad utilizada
                  </label>
                  <input
                    value={inputQty}
                    onKeyDown={handleNumericKeyDown}
                    onChange={(e) => setInputQty(sanitizeDecimal(e.target.value))}
                    inputMode="decimal"
                    type="text"
                    placeholder="50"
                    className="no-spinners min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Unidad
                  </label>
                  <select
                    value={recipeUnit}
                    onChange={(e) => setRecipeUnit(e.target.value)}
                    className="min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
                  >
                    {availableUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {Number(inputQty) > 0 && currentSupply && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <p className="font-semibold">
                    Equivalencia:{' '}
                    <strong>
                      {inputQty} {recipeUnit} ={' '}
                      {convertToBaseQty(Number(inputQty), recipeUnit, currentSupply.unit)}{' '}
                      {currentSupply.unit}
                    </strong>
                  </p>
                  <p className="mt-1 font-bold text-indigo-700 dark:text-indigo-300">
                    Subtotal en receta:{' '}
                    {money(
                      currentSupply.currentCost *
                        convertToBaseQty(Number(inputQty), recipeUnit, currentSupply.unit)
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-11 flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="min-h-11 flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition cursor-pointer"
              >
                Agregar
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Diálogo de confirmación para cambios no guardados */}
      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />

      <BottomNav />
    </main>
  )
}