// frontend/src/app/productos/[id]/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { Package, Trash2 } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import ToastAlert from '@/components/ToastAlert'
import { EmptyState } from '@/components/empty-state'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useUserRole } from '@/hooks/useUserRole'
import { productSchema } from '@/schemas/productSchema'
import { productService, type Product } from '@/services/productService'
import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { ApiError } from '@/services/api'
import { useRecipeStore, type RecipeState, type RecipeItem } from '@/stores/useRecipeStore'

import { ProductMasterDataForm } from './components/ProductMasterDataForm'
import { ProductRecipeBOM } from './components/ProductRecipeBOM'
import { ProductAddIngredientModal } from './components/ProductAddIngredientModal'
import { ProductDeleteDialog } from './components/ProductDeleteDialog'
import { ProductRemoveIngredientDialog } from './components/ProductRemoveIngredientDialog'
import { ProductFinancialCockpit } from './components/ProductFinancialCockpit'
import { ProductMobileSimulatorSheet } from './components/ProductMobileSimulatorSheet'
import { ProductMobileFooter } from './components/ProductMobileFooter'
import { ProductStatusBanner } from './components/ProductStatusBanner'

type ProductInput = z.input<typeof productSchema>

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
  const [showAddModal, setShowAddModal] = useState(false)
  const [ingredientToDelete, setIngredientToDelete] = useState<{ id: string; name: string } | null>(null)

  const [activeStrategy, setActiveStrategy] = useState<'target' | 'custom'>('target')
  const [flashingKey, setFlashingKey] = useState<'5' | '10' | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [product, setProduct] = useState<Product | null>(null)
  const [availablePantry, setAvailablePantry] = useState<Ingredient[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Unificación de todos los modales de la página en un solo lock coordinado
  useBodyScrollLock(showAddModal || showDeleteModal || isSimulatorOpen || Boolean(ingredientToDelete))

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

  const hasRecipe = items.length > 0

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
    window.setTimeout(() => setToast(null), 3000)
  }

  const { register, handleSubmit, reset, setValue, setError, control, formState: { errors, isDirty } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: { name: '', salePrice: '', minMarginPercent: '30' },
  })

  const watchedSalePrice = useWatch({ control, name: 'salePrice' }) as string | number
  const watchedMinMargin = useWatch({ control, name: 'minMarginPercent' }) as string | number
  const targetMargin = watchedMinMargin !== '' && !isNaN(Number(watchedMinMargin)) ? Number(watchedMinMargin) : (product?.minMarginPercent ?? 30)

  const { showDialog, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning(!isCollaborator && isDirty && !isSaving && !isDeleting)

  useEffect(() => { setSalePrice(Number(watchedSalePrice) || 0) }, [watchedSalePrice, setSalePrice])
  useEffect(() => { setMinMarginPercent(Number(watchedMinMargin) || 0) }, [watchedMinMargin, setMinMarginPercent])

  useEffect(() => {
    if (!id || isRoleLoading) return
    let active = true

    Promise.all([
      productService.getById(id, getToken),
      isCollaborator ? Promise.resolve(undefined) : ingredientService.getAll(getToken),
    ]).then(([prodData, ingredientsData]) => {
      if (!active) return
      setProduct(prodData)
      if (!isCollaborator && ingredientsData) setAvailablePantry(ingredientsData)

      reset({ name: prodData.name, salePrice: String(prodData.salePrice), minMarginPercent: String(prodData.minMarginPercent ?? 30) })
      setItems(prodData.ingredients.map((pi) => ({
        ingredientId: pi.ingredientId,
        name: pi.ingredient?.name || 'Insumo desconocido',
        unit: pi.ingredient?.unit || 'u',
        recipeUnit: pi.ingredient?.unit || 'u',
        inputQty: Number(pi.quantity),
        quantity: Number(pi.quantity),
        unitCost: pi.ingredient?.currentCost || 0,
      })))
      setSalePrice(prodData.salePrice)
      setMinMarginPercent(Number(prodData.minMarginPercent ?? 30))
    }).catch((err) => {
      if (active) setLoadError(err instanceof ApiError ? err.message : 'Error al cargar el producto')
    }).finally(() => {
      if (active) setIsLoading(false)
    })

    return () => { active = false; if (flashTimerRef.current) clearTimeout(flashTimerRef.current); resetStore() }
  }, [id, getToken, reset, setItems, setSalePrice, setMinMarginPercent, resetStore, isCollaborator, isRoleLoading])

  const applySuggestedMargin = (targetPercentage: number) => {
    if (!hasRecipe || cost <= 0) return
    const factor = targetPercentage < 100 ? 1 - targetPercentage / 100 : 0.5
    setValue('salePrice', String(Math.ceil(cost / factor)), { shouldValidate: true, shouldDirty: true })
    setActiveStrategy('target')
  }

  const adjustPriceFactor = (factor: number, key?: '5' | '10') => {
    if (key) {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      setFlashingKey(key)
      flashTimerRef.current = setTimeout(() => setFlashingKey(null), 180)
    }
    const sale = Number(watchedSalePrice) || 0
    const base = sale > 0 ? sale : cost
    if (base > 0) setValue('salePrice', String(Math.round(base * factor)), { shouldValidate: true, shouldDirty: true })
    setActiveStrategy('custom')
  }

  const handleAddIngredient = async (supply: Ingredient, inputQty: number, recipeUnit: string, baseQty: number) => {
    addIngredient({ ingredientId: supply.id, name: supply.name, unit: supply.unit, recipeUnit, inputQty, quantity: baseQty, unitCost: supply.currentCost })
    try {
      await productService.update(id!, { ingredients: (useRecipeStore.getState().items as RecipeItem[]).map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity })) }, getToken)
      setShowAddModal(false)
      notify(`"${supply.name}" sumado a la receta`)
    } catch { notify('Error al actualizar la receta', 'error') }
  }

  const confirmRemoveIngredient = async () => {
    if (!ingredientToDelete) return
    removeIngredient(ingredientToDelete.id)
    try {
      await productService.update(id!, { ingredients: (useRecipeStore.getState().items as RecipeItem[]).map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity })) }, getToken)
      notify(`"${ingredientToDelete.name}" eliminado de la receta`)
    } catch { notify('Error al actualizar la receta', 'error') } finally { setIngredientToDelete(null) }
  }

  const handleFormSubmit = async (data: ProductInput) => {
    submitLockRef.current = true
    setIsSaving(true)
    try {
      const updated = await productService.update(id!, { name: String(data.name), salePrice: Number(data.salePrice), minMarginPercent: Number(data.minMarginPercent), ingredients: items.map(i => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity) })) }, getToken)
      setProduct(updated)
      reset({ name: updated.name, salePrice: String(updated.salePrice), minMarginPercent: String(updated.minMarginPercent ?? 30) })
      notify('Producto guardado exitosamente', 'success')
      setIsSimulatorOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.message.toLowerCase()
        const field = err.status === 409 ? 'name' : msg.includes('name') || msg.includes('nombre') ? 'name' : msg.includes('saleprice') || msg.includes('precio') ? 'salePrice' : msg.includes('minmarginpercent') || msg.includes('margen') ? 'minMarginPercent' : null
        if (field) setError(field as keyof ProductInput, { type: 'server', message: err.message })
        notify(err.message, 'error')
      } else notify('Error al guardar los cambios', 'error')
    } finally { submitLockRef.current = false; setIsSaving(false) }
  }

  const onSave = (e?: React.BaseSyntheticEvent) => {
    if (submitLockRef.current) return
    void handleSubmit(handleFormSubmit)(e)
  }

  const handleDeleteProduct = async () => {
    try {
      setIsDeleting(true)
      await productService.delete(id!, getToken)
      notify('Producto eliminado correctamente.')
      setTimeout(() => navigate('/productos'), 600)
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'No se pudo eliminar el producto.', 'error')
      setIsDeleting(false); setShowDeleteModal(false)
    }
  }

  if (isLoading || isRoleLoading) return <main className="min-h-screen bg-gray-50 px-4 pt-5 dark:bg-gray-950"><div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl space-y-6"><div className="h-10 w-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" /><div className="h-64 w-full animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" /></div></main>
  if (loadError || !product) return <main className="min-h-screen bg-gray-50 px-4 pt-5 dark:bg-gray-950"><div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl"><Navbar title="Producto no encontrado" backHref="/productos" /><div className="mt-8"><EmptyState icon={<Package className="size-6" />} title="Ficha técnica inexistente" description={loadError || 'No pudimos encontrar los datos del producto solicitado.'} actionLabel="Volver al catálogo" onAction={() => navigate('/productos')} /></div></div><BottomNav /></main>

  const simulatorProps = { cost, margin, targetMargin, hasRecipe, watchedSalePrice: watchedSalePrice as string | number, isSaving, activeStrategy, flashingKey, register, setValue, errors, onAdjustPriceFactor: adjustPriceFactor, onApplySuggestedMargin: applySuggestedMargin, onSave, setActiveStrategy }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-44 pt-5 text-gray-900 md:px-8 md:pb-16 lg:px-12 dark:bg-gray-950 dark:text-gray-100">
      {toast && <ToastAlert key={`${toast.type}-${toast.message}`} message={toast.message} type={toast.type} />}
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 md:max-w-5xl lg:max-w-6xl">
        <Navbar title={product.name} backHref="/productos" />
        <ProductStatusBanner isCollaborator={isCollaborator} hasRecipe={hasRecipe} hasCriticalMargin={margin < -100} isHealthy={isHealthy} hasHealthyMargin={margin >= 100} targetMargin={targetMargin} margin={margin} />
        <form onSubmit={onSave} noValidate>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            <div className={`space-y-6 ${isCollaborator ? 'lg:col-span-12 max-w-3xl mx-auto w-full' : 'lg:col-span-7'}`}>
              <ProductMasterDataForm isCollaborator={isCollaborator} isDirty={isDirty} productName={product.name} salePrice={product.salePrice} register={register} setValue={setValue} errors={errors} watchedMinMargin={watchedMinMargin} />
              <ProductRecipeBOM isCollaborator={isCollaborator} items={items} onAddIngredient={() => setShowAddModal(true)} onRemoveIngredient={(id, name) => setIngredientToDelete({ id, name })} />
              {!isCollaborator && (
                <section className="rounded-3xl border border-rose-100 bg-rose-50/40 p-5 dark:border-rose-900/30 dark:bg-rose-950/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Eliminar este producto</h3><p className="text-xs text-rose-600 dark:text-rose-400">Se borrará la ficha técnica y todas sus relaciones.</p></div>
                    <button type="button" onClick={() => setShowDeleteModal(true)} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"><Trash2 className="size-4" /> Eliminar Producto</button>
                  </div>
                </section>
              )}
            </div>
            {!isCollaborator && <ProductFinancialCockpit gain={gain} {...simulatorProps} />}
          </div>
          <ProductMobileFooter isCollaborator={isCollaborator} watchedSalePrice={watchedSalePrice as string | number} gain={gain} cost={cost} margin={margin} targetMargin={targetMargin} itemsCount={items.length} isSaving={isSaving} onOpenSimulator={() => setIsSimulatorOpen(true)} />
        </form>
      </div>
      {showAddModal && !isCollaborator && <ProductAddIngredientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} availablePantry={availablePantry} isLoadingSupplies={false} onAdd={handleAddIngredient} />}
      <ProductDeleteDialog isOpen={showDeleteModal} isDeleting={isDeleting} productName={product.name} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteProduct} />
      <ProductRemoveIngredientDialog ingredientName={ingredientToDelete?.name || null} onClose={() => setIngredientToDelete(null)} onConfirm={confirmRemoveIngredient} />
      {!isCollaborator && <ProductMobileSimulatorSheet isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} gain={gain} {...simulatorProps} />}
      <UnsavedChangesDialog open={showDialog} onConfirm={confirmNavigation} onCancel={cancelNavigation} />
      <BottomNav />
    </main>
  )
}