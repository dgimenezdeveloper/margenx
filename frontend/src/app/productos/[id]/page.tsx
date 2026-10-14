'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { AlertTriangle, LoaderCircle, Package, ShieldCheck, Save, Pencil, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import ToastAlert from '@/components/ToastAlert'
import { EmptyState } from '@/components/empty-state'
import { MarginBadge } from '@/components/MarginBadge'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { productSchema } from '@/schemas/productSchema'
import { productService, type Product } from '@/services/productService'
import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { ApiError } from '@/services/api'
import { useRecipeStore, type RecipeState, type RecipeItem } from '@/stores/useRecipeStore'
import { useUserRole } from '@/hooks/useUserRole'

// Subcomponentes modulares
import { ProductMasterDataForm } from './components/ProductMasterDataForm'
import { ProductRecipeBOM } from './components/ProductRecipeBOM'
import { ProductSimulatorPanel } from './components/ProductSimulatorPanel'
import { ProductAddIngredientModal } from './components/ProductAddIngredientModal'

type ProductInput = z.input<typeof productSchema>
const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { isCollaborator, isLoading: isRoleLoading } = useUserRole()

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const submitLockRef = useRef(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)

  const [ingredientToDelete, setIngredientToDelete] = useState<{ id: string; name: string } | null>(null)
  const [activeStrategy, setActiveStrategy] = useState<'target' | 'custom'>('target')

  const [flashingKey, setFlashingKey] = useState<'5' | '10' | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerFlash = (key: '5' | '10') => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setFlashingKey(key)
    flashTimerRef.current = setTimeout(() => {
      setFlashingKey(null)
    }, 180)
  }

  const [product, setProduct] = useState<Product | null>(null)
  const [availablePantry, setAvailablePantry] = useState<Ingredient[]>([])

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useBodyScrollLock(isSimulatorOpen || showDeleteModal || showAddModal || Boolean(ingredientToDelete))

  const items = useRecipeStore((s: RecipeState) => s.items)
  const setItems = useRecipeStore((s: RecipeState) => s.setItems)
  const addIngredient = useRecipeStore((s: RecipeState) => s.addIngredient)
  const removeIngredient = useRecipeStore((s: RecipeState) => s.removeIngredient)
  const setSalePrice = useRecipeStore((s: RecipeState) => s.setSalePrice)
  const setMinMarginPercent = useRecipeStore((s: RecipeState) => s.setMinMarginPercent)
  const resetStore = useRecipeStore((s: RecipeState) => s.reset)

  const cost = useRecipeStore((s: RecipeState) => s.totalCost())
  const margin = useRecipeStore((s: RecipeState) => s.marginPercent())
  const gain = useRecipeStore((s: RecipeState) => s.marginAmount())
  const isHealthy = useRecipeStore((s: RecipeState) => !s.isUnderMargin())

  const hasCriticalMargin = margin < -100
  const hasHealthyMargin = margin >= 100
  const hasRecipe = items.length > 0

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
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: { name: '', salePrice: '', minMarginPercent: '30' },
  })

  const watchedSalePrice = useWatch({ control, name: 'salePrice' })
  const watchedMinMargin = useWatch({ control, name: 'minMarginPercent' })

  const { showDialog, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning(
    !isCollaborator && isDirty && !isSaving && !isDeleting
  )

  useEffect(() => {
    setSalePrice(Number(watchedSalePrice) || 0)
  }, [watchedSalePrice, setSalePrice])

  useEffect(() => {
    setMinMarginPercent(Number(watchedMinMargin) || 0)
  }, [watchedMinMargin, setMinMarginPercent])

  useEffect(() => {
    if (!id || isRoleLoading) return

    let active = true

    Promise.all([
      productService.getById(id, getToken),
      isCollaborator ? Promise.resolve(undefined) : ingredientService.getAll(getToken),
    ])
      .then(([prodData, ingredientsData]) => {
        if (!active) return
        setProduct(prodData)

        if (!isCollaborator && ingredientsData) {
          setAvailablePantry(ingredientsData)
        }

        reset({
          name: prodData.name,
          salePrice: String(prodData.salePrice),
          minMarginPercent: String(prodData.minMarginPercent ?? 30),
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
        setMinMarginPercent(Number(prodData.minMarginPercent ?? 30))
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Error al cargar el producto')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      resetStore()
    }
  }, [id, getToken, reset, setItems, setSalePrice, setMinMarginPercent, resetStore, isCollaborator, isRoleLoading])

  const parsedWatchedMargin = Number(watchedMinMargin)
  const targetMargin =
    watchedMinMargin !== '' && !isNaN(parsedWatchedMargin)
      ? parsedWatchedMargin
      : (product?.minMarginPercent != null ? Number(product.minMarginPercent) : 30)

  const applySuggestedMargin = (targetPercentage: number) => {
    if (!hasRecipe || cost <= 0) return
    const factor = targetPercentage < 100 ? 1 - targetPercentage / 100 : 0.5
    const suggestedPrice = Math.ceil(cost / factor)
    setValue('salePrice', String(suggestedPrice), { shouldValidate: true, shouldDirty: true })
    setActiveStrategy('target')
  }

  const adjustPriceFactor = (factor: number, key?: '5' | '10') => {
    if (key) triggerFlash(key)
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
    setActiveStrategy('custom')
  }

  const handleAddIngredient = async (supply: Ingredient, inputQty: number, recipeUnit: string, baseQty: number) => {
    const newItem: RecipeItem = {
      ingredientId: supply.id,
      name: supply.name,
      unit: supply.unit,
      recipeUnit,
      inputQty,
      quantity: baseQty,
      unitCost: supply.currentCost,
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
      notify(`"${supply.name}" sumado a la receta`)
    } catch {
      notify('Error al actualizar la receta', 'error')
    }
  }

  const confirmRemoveIngredient = async () => {
    if (!ingredientToDelete) return

    removeIngredient(ingredientToDelete.id)
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
      notify(`"${ingredientToDelete.name}" eliminado de la receta`)
    } catch {
      notify('Error al actualizar la receta', 'error')
    } finally {
      setIngredientToDelete(null)
    }
  }

  const handleFormSubmit = async (data: ProductInput) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setIsSaving(true)

    const payload = {
      name: String(data.name),
      salePrice: Number(data.salePrice),
      minMarginPercent: Number(data.minMarginPercent),
      ingredients: items.map((item: RecipeItem) => ({
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
        minMarginPercent: String(updated.minMarginPercent ?? 30),
      })
      notify('Producto guardado exitosamente', 'success')
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
          setError(field as keyof ProductInput, { type: 'server', message: err.message })
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

  const handleSaveFromBottomSheet = async () => {
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
      notify(err instanceof ApiError ? err.message : 'No se pudo eliminar el producto.', 'error')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (isLoading || isRoleLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pt-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl space-y-6">
          <div className="h-10 w-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="h-36 w-full animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-64 w-full animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
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
          <div className="mt-8">
            <EmptyState
              icon={<Package className="size-6" />}
              title="Ficha técnica inexistente"
              description={loadError || 'No pudimos encontrar los datos del producto solicitado.'}
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
      {toast && <ToastAlert key={`${toast.type}-${toast.message}`} message={toast.message} type={toast.type} />}

      <div className="mx-auto flex w-full max-w-md flex-col gap-6 md:max-w-5xl lg:max-w-6xl">
        <Navbar title={product.name} backHref="/productos" />

        {!isCollaborator && (
          !hasRecipe ? (
            <section className="rounded-3xl border-2 border-gray-200 bg-gray-100 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado del producto</p>
              <p className="mt-1 text-2xl font-black text-gray-700 dark:text-gray-300">Borrador (Sin Receta)</p>
            </section>
          ) : hasCriticalMargin ? (
            <section className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40">
              <div className="flex justify-between items-start gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200/70 px-2.5 py-1 text-xs font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                  <AlertTriangle className="size-3.5" /> Margen Bajo
                </span>
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Objetivo: {targetMargin}%</span>
              </div>
              <p className="mt-2 text-5xl font-black tracking-tight text-rose-700 dark:text-rose-300">{margin}%</p>
            </section>
          ) : isHealthy || hasHealthyMargin ? (
            <section className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <div className="flex justify-between items-start gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/70 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="size-3.5" /> Margen Saludable
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Objetivo: {targetMargin}%</span>
              </div>
              <p className="mt-2 text-5xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">{margin.toFixed(1)}%</p>
            </section>
          ) : (
            <section className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40">
              <div className="flex justify-between items-start gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200/70 px-2.5 py-1 text-xs font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                  <AlertTriangle className="size-3.5" /> Margen Bajo
                </span>
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Objetivo: {targetMargin}%</span>
              </div>
              <p className="mt-2 text-5xl font-black tracking-tight text-rose-700 dark:text-rose-300">{margin.toFixed(1)}%</p>
            </section>
          )
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className={`space-y-6 ${isCollaborator ? 'lg:col-span-12 max-w-3xl mx-auto w-full' : 'lg:col-span-7'}`}>

              <ProductMasterDataForm
                isCollaborator={isCollaborator}
                isDirty={isDirty}
                productName={product.name}
                salePrice={product.salePrice}
                register={register}
                setValue={setValue}
                errors={errors}
              />

              <ProductRecipeBOM
                isCollaborator={isCollaborator}
                items={items}
                onAddIngredient={() => setShowAddModal(true)}
                onRemoveIngredient={(id, name) => setIngredientToDelete({ id, name })}
              />

              {!isCollaborator && (
                <section className="rounded-3xl border border-rose-100 bg-rose-50/40 p-5 dark:border-rose-900/30 dark:bg-rose-950/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Eliminar este producto</h3>
                      <p className="text-xs text-rose-600 dark:text-rose-400">Se borrará la ficha técnica y todas sus relaciones en el catálogo.</p>
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
              )}
            </div>

            {!isCollaborator && (
              <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-6">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-800 dark:bg-gray-900 space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Simulador Financiero</h3>
                      <p className="text-base font-black text-gray-900 dark:text-white mt-1">Costo Total: {money(cost)}</p>
                    </div>
                    <span className={`text-sm font-black ${!hasRecipe ? 'text-gray-400' : gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      Ganancia: {!hasRecipe ? '$0' : money(gain)}
                    </span>
                  </div>

                  <ProductSimulatorPanel
                    cost={cost}
                    margin={margin}
                    targetMargin={targetMargin}
                    hasRecipe={hasRecipe}
                    watchedSalePrice={watchedSalePrice as string | number}
                    isSaving={isSaving}
                    activeStrategy={activeStrategy}
                    flashingKey={flashingKey}
                    register={register}
                    setValue={setValue}
                    errors={errors}
                    onAdjustPriceFactor={adjustPriceFactor}
                    onApplySuggestedMargin={applySuggestedMargin}
                    onSave={handleSubmit(handleFormSubmit)}
                    setActiveStrategy={setActiveStrategy}
                  />
                </div>
              </div>
            )}
          </div>

          <footer className="fixed inset-x-0 bottom-[calc(3rem+max(0.75rem,env(safe-area-inset-bottom)))] md:bottom-0 z-10 border-t border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95">
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Precio: <strong className="text-gray-900 dark:text-gray-100">{money(Number(watchedSalePrice) || 0)}</strong></span>
                  {!isCollaborator && (
                    <span className="text-gray-500 dark:text-gray-400">Ganancia: <strong className={gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{money(gain)}</strong></span>
                  )}
                </div>
                {!isCollaborator && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Costo: <strong className="text-gray-800 dark:text-gray-200">{money(cost)}</strong></span>
                    <MarginBadge marginPercent={margin} minMarginPercent={targetMargin} ingredientsCount={items.length} size="sm" />
                  </div>
                )}
              </div>

              {!isCollaborator && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSimulatorOpen(true)}
                    className="flex min-h-11 h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <Pencil className="size-3.5" /> Ajustar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex min-h-11 h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Guardar
                  </button>
                </div>
              )}
            </div>
          </footer>
        </form>
      </div>

      {showAddModal && !isCollaborator && (
        <ProductAddIngredientModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          availablePantry={availablePantry}
          isLoadingSupplies={false}
          onAdd={handleAddIngredient}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => !isDeleting && setShowDeleteModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">¿Eliminar producto?</h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Estás a punto de eliminar definitivamente <strong>{product?.name}</strong>.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" disabled={isDeleting} onClick={() => setShowDeleteModal(false)} className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50 transition">Cancelar</button>
              <button type="button" disabled={isDeleting} onClick={handleDeleteProduct} className="min-h-11 flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 transition">
                {isDeleting && <LoaderCircle className="size-3.5 animate-spin" />} {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ingredientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIngredientToDelete(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">¿Quitar insumo de la receta?</h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Estás a punto de remover <strong>{ingredientToDelete?.name}</strong> de la preparación.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setIngredientToDelete(null)} className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer transition">Cancelar</button>
              <button type="button" onClick={confirmRemoveIngredient} className="min-h-11 flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 cursor-pointer inline-flex items-center justify-center gap-1.5 transition">Sí, quitar</button>
            </div>
          </div>
        </div>
      )}

      {!isCollaborator && isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsSimulatorOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-transparent bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div><p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Simulador de Precio (Costo: {money(cost)})</p></div>
              <span className={`text-sm font-black ${!hasRecipe ? 'text-gray-400' : gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>Ganancia: {!hasRecipe ? '$0' : money(gain)}</span>
            </div>
            <div className="mt-5">
              <ProductSimulatorPanel
                cost={cost}
                margin={margin}
                targetMargin={targetMargin}
                hasRecipe={hasRecipe}
                watchedSalePrice={watchedSalePrice as string | number}
                isSaving={isSaving}
                activeStrategy={activeStrategy}
                flashingKey={flashingKey}
                register={register}
                setValue={setValue}
                errors={errors}
                onAdjustPriceFactor={adjustPriceFactor}
                onApplySuggestedMargin={applySuggestedMargin}
                onSave={handleSaveFromBottomSheet}
                onCancel={() => setIsSimulatorOpen(false)}
                isMobile={true}
                setActiveStrategy={setActiveStrategy}
              />
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesDialog open={showDialog} onConfirm={confirmNavigation} onCancel={cancelNavigation} />
      <BottomNav/>
    </main>
  )
}