'use client'

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  Check,
  LoaderCircle,
  Package,
  Plus,
  Trash2,
  X,
  ShieldCheck,
  Save,
  Pencil,
} from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { productSchema, type ProductFormValues } from '@/schemas/productSchema'
import { productService, type Product } from '@/services/productService'
import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { ApiError } from '@/services/api'

type RecipeItem = {
  id: string
  name: string
  baseUnit: string
  recipeUnit: string
  inputQty: number
  baseQty: number
  cost: number
}

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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setErrorState] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSheet, setShowSheet] = useState(false)

  const [product, setProduct] = useState<Product | null>(null)
  const [availablePantry, setAvailablePantry] = useState<Ingredient[]>([])

  const [toast, setToast] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSupplyId, setSelectedSupplyId] = useState('')
  const [recipeUnit, setRecipeUnit] = useState('gr')
  const [inputQty, setInputQty] = useState('50')
  const [recipe, setRecipe] = useState<RecipeItem[]>([])

  const notify = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3000)
  }

  // Formulario React Hook Form + Zod
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

  // Carga inicial del producto
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

        const mappedRecipe = prodData.ingredients.map((pi) => ({
          id: pi.ingredientId,
          name: pi.ingredient?.name || 'Insumo desconocido',
          baseUnit: pi.ingredient?.unit || 'u',
          recipeUnit: pi.ingredient?.unit || 'u',
          inputQty: pi.quantity,
          baseQty: pi.quantity,
          cost: pi.ingredient?.currentCost || 0,
        }))
        setRecipe(mappedRecipe)

        if (ingredientsData.length > 0 && ingredientsData[0]) {
          setSelectedSupplyId(ingredientsData[0].id)
          setRecipeUnit(getAvailableRecipeUnits(ingredientsData[0].unit)[0] || 'kg')
        }
      })
      .catch((err) => {
        if (active) setErrorState(err instanceof ApiError ? err.message : 'Error al cargar el producto')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, getToken, reset])

  // Estado Visual 1: Skeletons de carga
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

  // Estado Visual 2: Error de red o 404
  if (error || !product) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pt-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl">
          <Navbar title="Producto no encontrado" backHref="/productos" />
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error || 'El producto que buscas no existe o pertenece a otra cuenta.'}
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

  const currentSupply = availablePantry.find((p) => p.id === selectedSupplyId) || availablePantry[0]
  const availableUnits = currentSupply ? getAvailableRecipeUnits(currentSupply.unit) : ['u']

  const hasRecipe = recipe.length > 0
  const cost = recipe.reduce((sum, item) => sum + item.baseQty * item.cost, 0)
  const sale = Number(watchedSalePrice) || 0

  const margin =
    hasRecipe && sale > 0 && cost > 0
      ? Math.round(((sale - cost) / sale) * 1000) / 10
      : 0
  const gain = hasRecipe && cost > 0 ? sale - cost : 0
  const targetMargin = Number(watchedMinMargin) || product.minMarginPercent
  const isHealthy = hasRecipe && margin >= targetMargin

  const applySuggestedMargin = (targetPercentage: number) => {
    if (!hasRecipe || cost <= 0) return
    const factor = targetPercentage < 100 ? 1 - targetPercentage / 100 : 0.5
    const suggestedPrice = Math.round(cost / factor)
    setValue('salePrice', String(suggestedPrice), { shouldValidate: true, shouldDirty: true })
  }

  const adjustPriceFactor = (factor: number) => {
    if (sale <= 0) return
    setValue('salePrice', String(Math.round(sale * factor)), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  const handleSelectSupply = (supplyId: string) => {
    setSelectedSupplyId(supplyId)
    const item = availablePantry.find((p) => p.id === supplyId)
    if (item) {
      const units = getAvailableRecipeUnits(item.unit)
      setRecipeUnit(units[0] || 'kg')
      setInputQty(units[0] === 'gr' ? '50' : units[0] === 'ml' ? '30' : '1')
    }
  }

  const handleAddIngredient = async () => {
    const numQty = Number(inputQty)
    if (currentSupply && numQty > 0) {
      const baseQty = convertToBaseQty(numQty, recipeUnit, currentSupply.unit)
      const newRecipe = [
        ...recipe,
        {
          id: currentSupply.id,
          name: currentSupply.name,
          baseUnit: currentSupply.unit,
          recipeUnit,
          inputQty: numQty,
          baseQty,
          cost: currentSupply.currentCost,
        },
      ]

      try {
        await productService.update(id!, {
          ingredients: newRecipe.map((r) => ({ ingredientId: r.id, quantity: r.baseQty })),
        }, getToken)
        setRecipe(newRecipe)
        setShowAddModal(false)
        notify(`"${currentSupply.name}" sumado a la receta`)
      } catch {
        notify('Error al actualizar la receta')
      }
    }
  }

  const handleRemoveIngredient = async (indexToRemove: number) => {
    const newRecipe = recipe.filter((_, i) => i !== indexToRemove)
    try {
      await productService.update(id!, {
        ingredients: newRecipe.map((r) => ({ ingredientId: r.id, quantity: r.baseQty })),
      }, getToken)
      setRecipe(newRecipe)
      notify('Insumo eliminado de la receta')
    } catch {
      notify('Error al actualizar la receta')
    }
  }

  // Guardar formulario de edición con mapeo de errores del backend
  const handleFormSubmit = async (data: ProductFormValues) => {
    try {
      setIsSaving(true)
      const updated = await productService.update(id!, {
        name: data.name,
        salePrice: data.salePrice,
        minMarginPercent: data.minMarginPercent,
      }, getToken)
      setProduct(updated)
      reset({
        name: updated.name,
        salePrice: String(updated.salePrice),
        minMarginPercent: String(updated.minMarginPercent),
      })
      notify('Datos del producto guardados exitosamente')
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorMsg = err.message.toLowerCase()
        if (errorMsg.includes('name') || errorMsg.includes('nombre')) {
          setError('name', { type: 'server', message: err.message })
        } else if (errorMsg.includes('saleprice') || errorMsg.includes('precio')) {
          setError('salePrice', { type: 'server', message: err.message })
        } else if (errorMsg.includes('minmarginpercent') || errorMsg.includes('margen')) {
          setError('minMarginPercent', { type: 'server', message: err.message })
        }
        notify(err.message)
      } else {
        notify('Error al guardar los cambios')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePriceFromSheet = async () => {
    await handleSubmit(async (data) => {
      await handleFormSubmit(data)
      setShowSheet(false)
    })()
  }

  const handleDeleteProduct = async () => {
    try {
      setIsDeleting(true)
      await productService.delete(id!, getToken)
      notify('Producto eliminado correctamente.')
      setTimeout(() => navigate('/productos'), 600)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'No se pudo eliminar el producto.')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-44 pt-5 text-gray-900 md:px-8 md:pb-16 lg:px-12 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4">
          <Check className="size-5" />
          {toast}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-col gap-6 md:max-w-5xl lg:max-w-6xl">
        <Navbar title={product.name} backHref="/productos" />

        {/* Banner de Estado de Margen */}
        {!hasRecipe ? (
          <section className="rounded-2xl border-2 border-gray-200 bg-gray-100 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
        ) : isHealthy ? (
          <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 shadow-sm transition-all duration-300 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <div className="flex justify-between items-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/70 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="size-3.5" /> Margen Saludable
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Objetivo: {targetMargin}%
              </span>
            </div>
            <p className="mt-2 text-5xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
              {margin}%
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Cumple con el umbral mínimo esperado.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm transition-all duration-300 dark:border-rose-900/60 dark:bg-rose-950/40">
            <div className="flex justify-between items-start">
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
              Por debajo del mínimo ({targetMargin}%)
            </p>
          </section>
        )}

        {/* Grilla Principal */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-7">
            {/* Formulario de Edición con Zod */}
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4"
              noValidate
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <h2 className="text-base font-bold">Datos del Producto</h2>
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
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-800"
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
                  <input
                    {...register('salePrice')}
                    inputMode="decimal"
                    type="number"
                    step="any"
                    className="no-spinners h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-800"
                  />
                  {errors.salePrice && (
                    <p className="mt-1 text-xs font-bold text-rose-500">{errors.salePrice.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    Margen Mínimo (%)
                  </label>
                  <input
                    {...register('minMarginPercent')}
                    inputMode="decimal"
                    type="number"
                    step="any"
                    className="no-spinners h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-800"
                  />
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
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
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

            {/* Ficha Técnica / Receta */}
            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Composición / Receta</h2>
                <span className="text-xs font-semibold text-gray-400">
                  {recipe.length} ingredientes
                </span>
              </div>

              {!hasRecipe ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400 dark:border-gray-800">
                  Sin insumos cargados. Suma ingredientes para costear el producto.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recipe.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex items-center justify-between py-3.5 text-sm"
                    >
                      <div>
                        <strong className="block font-bold">{item.name}</strong>
                        <span className="text-xs text-gray-500">
                          {item.inputQty} {item.recipeUnit} ({item.baseQty} {item.baseUnit}) ·
                          Subtotal: {money(item.baseQty * item.cost)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Remover insumo"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 py-3.5 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50/50 dark:border-indigo-800 dark:text-indigo-400 cursor-pointer"
              >
                <Plus className="size-4" /> Agregar Insumo a la Receta
              </button>
            </section>

            {/* Zona de Peligro: Botón de Eliminación */}
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
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
                >
                  <Trash2 className="size-4" /> Eliminar Producto
                </button>
              </div>
            </section>
          </div>

          {/* Columna Derecha: Simulador de Precio (Desktop >= 1024px) */}
          <div className="hidden lg:col-span-5 lg:sticky lg:top-6 lg:block">
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
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                  }`}
                >
                  Ganancia: {!hasRecipe ? '$0' : money(gain)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Ajustes Rápidos</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => adjustPriceFactor(1.05)}
                    className="rounded-xl border py-2.5 text-xs font-bold hover:bg-gray-50 dark:border-gray-700 cursor-pointer"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustPriceFactor(1.10)}
                    className="rounded-xl border py-2.5 text-xs font-bold hover:bg-gray-50 dark:border-gray-700 cursor-pointer"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    disabled={!hasRecipe || cost <= 0}
                    onClick={() => applySuggestedMargin(targetMargin)}
                    className="rounded-xl bg-indigo-50 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sugerir {targetMargin}%
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Precio de Venta</label>
                <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800">
                  <span className="text-lg font-bold text-gray-400">$</span>
                  <input
                    value={watchedSalePrice == null ? '' : String(watchedSalePrice)}
                    onChange={(e) =>
                      setValue('salePrice', e.target.value.replace(/[^0-9.]/g, ''), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    inputMode="decimal"
                    type="number"
                    step="any"
                    className="no-spinners w-full bg-transparent px-2 text-lg font-bold outline-none"
                  />
                </div>
              </div>

              <p
                className={`text-xs font-bold ${
                  !hasRecipe
                    ? 'text-gray-500 dark:text-gray-400'
                    : margin >= targetMargin
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                }`}
              >
                {!hasRecipe
                  ? 'Proyección: 0.0% (Sin Receta)'
                  : `Proyección: Margen ${margin}% ${margin >= targetMargin ? '✅' : '⚠️'}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRA FLOTANTE MÓVIL (< 1024px) ── */}
      {!showSheet && (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto flex h-14 max-w-md items-center justify-between border-t border-gray-100 bg-white/95 px-5 shadow-sm backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-medium text-gray-500">Costo: {money(cost)}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              Ganancia:{' '}
              <strong
                className={
                  !hasRecipe
                    ? 'text-gray-400 dark:text-gray-500'
                    : gain >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                }
              >
                {!hasRecipe ? '$0' : money(gain)}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSheet(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
          >
            <Pencil className="size-3.5" /> Ajustar Precio
          </button>
        </div>
      )}

      {/* ── BOTTOM SHEET / MODAL DEL SIMULADOR MÓVIL (< 1024px) ── */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowSheet(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />

            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>SIMULADOR DE PRECIO (Costo: {money(cost)})</span>
              <span
                className={
                  !hasRecipe
                    ? 'text-sm font-bold text-gray-400 dark:text-gray-500'
                    : gain >= 0
                      ? 'text-sm font-bold text-emerald-700'
                      : 'text-sm font-bold text-rose-700'
                }
              >
                Ganancia: {!hasRecipe ? '$0' : money(gain)}
              </span>
            </div>

            {/* Botones de ajuste rápido en móvil */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => adjustPriceFactor(1.05)}
                className="rounded-xl border py-2.5 text-xs font-bold hover:bg-gray-50 dark:border-gray-700 cursor-pointer"
              >
                +5%
              </button>
              <button
                type="button"
                onClick={() => adjustPriceFactor(1.10)}
                className="rounded-xl border py-2.5 text-xs font-bold hover:bg-gray-50 dark:border-gray-700 cursor-pointer"
              >
                +10%
              </button>
              <button
                type="button"
                disabled={!hasRecipe || cost <= 0}
                onClick={() => applySuggestedMargin(targetMargin)}
                className="rounded-xl border border-indigo-100 bg-indigo-50 py-2.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sugerir {targetMargin}%
              </button>
            </div>

            {/* Input de precio en móvil */}
            <label className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">
              Precio de Venta
              <div className="mt-1 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800">
                <span className="text-lg font-bold text-gray-400">$</span>
                <input
                  value={String(watchedSalePrice || '')}
                  onChange={(e) =>
                    setValue('salePrice', e.target.value.replace(/[^0-9.]/g, ''), {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  inputMode="decimal"
                  type="number"
                  step="any"
                  className="no-spinners w-full bg-transparent px-2 text-lg font-bold outline-none"
                />
              </div>
            </label>

            {/* Proyección de margen en móvil */}
            <p
              className={`mt-2 text-xs font-bold ${
                !hasRecipe
                  ? 'text-gray-500 dark:text-gray-400'
                  : margin >= targetMargin
                    ? 'text-emerald-700'
                    : 'text-rose-700'
              }`}
            >
              {!hasRecipe
                ? 'Proyección: 0.0% (Sin Receta)'
                : `Proyección: Nuevo margen ${margin}% ${margin >= targetMargin ? '✅' : '⚠️'}`}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePriceFromSheet}
                disabled={isSaving}
                className="flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isSaving && <LoaderCircle className="size-4 animate-spin" />}
                {isSaving ? 'Guardando...' : 'Guardar Precio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Diálogo de Confirmación de Eliminación */}
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
                className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteProduct}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isDeleting && <LoaderCircle className="size-3.5 animate-spin" />}
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Agregar Insumo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs md:items-center animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowAddModal(false)} />
          <section className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-indigo-600">Despensa</p>
                <h2 className="mt-1 text-xl font-bold">Sumar Insumo a la Receta</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1 text-gray-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                Seleccionar Insumo
                <select
                  value={selectedSupplyId}
                  onChange={(e) => handleSelectSupply(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-800 outline-none"
                >
                  {availablePantry.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit}) - {money(item.currentCost)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Cantidad utilizada
                  </label>
                  <input
                    value={inputQty}
                    onChange={(e) => setInputQty(e.target.value)}
                    inputMode="decimal"
                    type="number"
                    step="any"
                    placeholder="50"
                    className="no-spinners h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-800 outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Unidad
                  </label>
                  <select
                    value={recipeUnit}
                    onChange={(e) => setRecipeUnit(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 outline-none focus:border-indigo-600"
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
                className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer"
              >
                Agregar
              </button>
            </div>
          </section>
        </div>
      )}

      <BottomNav />
    </main>
  )
}