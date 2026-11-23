'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  Info,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import ToastAlert from '@/components/ToastAlert'
import { QuickCreateIngredientModal } from '@/components/quick-create-ingredient-modal'
import { RecipeIngredientCombobox } from '@/components/recipe-ingredient-combobox'
import { MarginBadge } from '@/components/MarginBadge'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useToast } from '@/hooks/useToast'
import { productSchema, type ProductFormValues } from '@/schemas/productSchema'
import { ApiError } from '@/services/api'
import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { productService } from '@/services/productService'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useRecipeStore, type RecipeState } from '@/stores/useRecipeStore'
import { NumericInput } from '@/components/NumericInput'
import { ProductRemoveIngredientDialog } from '@/app/productos/[id]/components/ProductRemoveIngredientDialog'
import { RecipeQuantityField } from '@/app/productos/[id]/components/RecipeQuantityField'
import { getAvailableRecipeUnits, convertToBaseQty, convertToRecipeUnitQty } from '@/lib/recipeConversion'
import { formatMoney, formatPercent, formatQuantityWithUnit, formatUnit } from '@/lib/format'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { ABOVE_BOTTOM_NAV_CLASS } from '@/lib/mobile-layout'
import { cn } from '@/lib/utils'
import { HEALTH_BUCKET_META, resolveProductHealthBucket } from '@/lib/healthBucket'
import { productNoticeState } from '@/lib/productNotice'

const money = (val: number) => formatMoney(val)

export default function NewProductPage() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { defaultMinMarginPercent, isLoading: isLoadingUser } = useCurrentUser()

  const { toast, notify, dismiss: dismissToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Aviso de producto creado que espera a que la pantalla quede sin cambios para ir a la lista (#432).
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const submitLockRef = useRef(false)
  const isNavigatingAfterSaveRef = useRef(false)

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

  const [supplies, setSupplies] = useState<Ingredient[]>([])
  const [isLoadingSupplies, setIsLoadingSupplies] = useState(true)

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  // Insumo elegido desde la búsqueda en la API o recién creado: puede no estar en la lista cargada.
  const [pickedSupply, setPickedSupply] = useState<Ingredient | null>(null)
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>('')
  const [recipeUnit, setRecipeUnit] = useState('gr')
  const [inputQty, setInputQty] = useState('100')
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [quickCreateInitialName, setQuickCreateInitialName] = useState('')
  const comboboxTriggerRef = useRef<HTMLButtonElement | null>(null)

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

  const hasUnsavedChanges =
    (isDirty || items.length > 0) && !isSubmitting && !isNavigatingAfterSaveRef.current

  useBodyScrollLock(isDropdownOpen)
  const { showDialog, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning(hasUnsavedChanges)

  // Se navega recién cuando el formulario ya se limpió: si se navegara en el mismo paso que el
  // guardado, la protección de cambios sin guardar todavía estaría activa y frenaría la salida.
  // El aviso viaja a la lista, porque mostrado acá se perdía al redirigir (#432).
  useEffect(() => {
    if (savedNotice && !hasUnsavedChanges) {
      navigate('/productos', { state: productNoticeState(savedNotice) })
    }
  }, [savedNotice, hasUnsavedChanges, navigate])

  const watchedSalePrice = useWatch({ control, name: 'salePrice' }) as string | number
  const watchedMinMargin = useWatch({ control, name: 'minMarginPercent' }) as string | number

  const targetMargin = Number(watchedMinMargin) || defaultMinMarginPercent || 30

  const bucket = resolveProductHealthBucket({
    hasRecipe: items.length > 0,
    marginPercent,
    minMarginPercent: targetMargin,
  })
  const statusMeta = HEALTH_BUCKET_META[bucket]

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
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      resetStore()
    }
  }, [getToken, resetStore, notify])

  const existingIngredientIds = useMemo(
    () => items.map((item) => item.ingredientId),
    [items]
  )
  const existingIngredientSet = useMemo(
    () => new Set(existingIngredientIds),
    [existingIngredientIds]
  )

  const selectedSupply = useMemo(() => {
    if (!selectedSupplyId || existingIngredientSet.has(selectedSupplyId)) return undefined
    return (
      (pickedSupply?.id === selectedSupplyId ? pickedSupply : undefined) ??
      supplies.find((s) => s.id === selectedSupplyId)
    )
  }, [existingIngredientSet, pickedSupply, selectedSupplyId, supplies])

  const availableUnits = useMemo(
    () => (selectedSupply ? getAvailableRecipeUnits(selectedSupply.unit) : ['kg']),
    [selectedSupply]
  )

  const handleSelectSupply = (supply: Ingredient) => {
    setPickedSupply(supply)
    setSelectedSupplyId(supply.id)
    const units = getAvailableRecipeUnits(supply.unit)
    const nextUnit = units[0] || supply.unit
    setRecipeUnit(nextUnit)
    setInputQty(nextUnit === 'gr' ? '100' : nextUnit === 'ml' ? '100' : '1')
  }

  const handleQuickCreated = (created: Ingredient) => {
    setSupplies((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
    )
    handleSelectSupply(created)
    setIsQuickCreateOpen(false)
    notify(`Insumo "${created.name}" creado y elegido`)
    comboboxTriggerRef.current?.focus()
  }

  const handleAddIngredient = () => {
    const num = Number(inputQty)
    if (!selectedSupply || existingIngredientSet.has(selectedSupply.id) || num <= 0) return

    const { baseQty } = convertToBaseQty(num, recipeUnit, selectedSupply.unit)
    if (baseQty <= 0) return

    addIngredient({
      ingredientId: selectedSupply.id,
      name: selectedSupply.name,
      unit: selectedSupply.unit,
      unitCost: selectedSupply.currentCost,
      quantity: baseQty,
      recipeUnit,
      inputQty: num,
    })

    const nextExisting = new Set([...existingIngredientIds, selectedSupply.id])
    const nextSupply = supplies.find((s) => !nextExisting.has(s.id))
    if (nextSupply) handleSelectSupply(nextSupply)
    else {
      setSelectedSupplyId('')
      setPickedSupply(null)
    }

    notify(`"${selectedSupply.name}" agregado a la receta`)
  }

  const confirmRemoveItem = () => {
    if (!ingredientToDelete) return
    const removedId = ingredientToDelete.id
    removeIngredient(removedId)
    if (!selectedSupply) {
      const restored = supplies.find((s) => s.id === removedId)
      if (restored) handleSelectSupply(restored)
    }
    notify(`"${ingredientToDelete.name}" eliminado de la receta`)
    setIngredientToDelete(null)
  }

  const handleUpdateQuantity = (id: string, inputQty: number, recipeUnit: string, baseQty: number) => {
    updateQuantity(id, baseQty, inputQty, recipeUnit)
  }

  const applySuggestedMargin = (percentage: number) => {
    if (items.length === 0 || totalCost <= 0) return
    const factor = percentage < 100 ? 1 - percentage / 100 : 0.5
    const suggested = Math.ceil(totalCost / factor)
    setValue('salePrice', String(suggested), { shouldValidate: true })
    setActiveStrategy('target')
  }

  const adjustPriceFactor = (factor: number, key?: '5' | '10') => {
    if (key) triggerFlash(key)
    const currentSale = Number(watchedSalePrice) || 0
    if (currentSale > 0) {
      setValue('salePrice', String(Math.round(currentSale * factor)), { shouldValidate: true })
    } else if (totalCost > 0) {
      setValue('salePrice', String(Math.round(totalCost * factor)), { shouldValidate: true })
    }
    setActiveStrategy('custom')
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

      const createdNotice =
        items.length === 0
          ? `Producto guardado en estado ${HEALTH_BUCKET_META.draft.label} (sin receta).`
          : 'Producto creado exitosamente con receta vinculada.'
      isNavigatingAfterSaveRef.current = true
      reset({ name: '', salePrice: '', minMarginPercent: '30' })
      resetStore()
      setSavedNotice(createdNotice)
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
  const { baseQty: previewBaseQty, precisionLost } = selectedSupply
    ? convertToBaseQty(previewNumericQty, recipeUnit, selectedSupply.unit)
    : { baseQty: 0, precisionLost: false }
  const previewSubtotal = selectedSupply ? previewBaseQty * selectedSupply.currentCost : 0

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-5 text-gray-900 md:px-8 md:pb-16 lg:px-12 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <ToastAlert
          key={toast.id}
          title={toast.title}
          type={toast.type}
          onClose={dismissToast}
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

                <div>
                  <label htmlFor="new-product-name" className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    Nombre del producto
                  </label>
                  <input
                    id="new-product-name"
                    {...register('name')}
                    placeholder="Ej. Medialunas de manteca — docena / Pan flauta 1kg"
                    className={cn(
                      'mt-2 min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800',
                      CANONICAL_FOCUS_CLASSES
                    )}
                    aria-invalid={errors.name ? 'true' : 'false'}
                    aria-describedby={errors.name ? 'new-product-name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="new-product-name-error" role="alert" className="mt-1 text-xs font-bold text-rose-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-product-sale-price" className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                      Precio de Venta
                    </label>
                    <NumericInput
                      id="new-product-sale-price"
                      aria-label="Precio de Venta"
                      value={watchedSalePrice}
                      onChange={(val) => {
                        setValue('salePrice', val, { shouldValidate: true, shouldDirty: true })
                        setActiveStrategy('custom')
                      }}
                      prefixSymbol="$"
                      prefixClassName="font-bold"
                      placeholder="0,00"
                      containerClassName={cn(
                        'mt-2 flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20',
                        CANONICAL_FOCUS_CLASSES
                      )}
                      className="text-base font-bold text-gray-900 dark:text-white dark:placeholder-gray-500"
                      error={errors.salePrice?.message}
                    />
                    <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      Separador decimal con coma (ej: 1.250,50).
                    </p>
                  </div>

                  <div>
                    <label htmlFor="new-product-min-margin" className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                      Margen Mínimo (%)
                    </label>
                    <NumericInput
                      id="new-product-min-margin"
                      aria-label="Margen Mínimo (%)"
                      value={watchedMinMargin}
                      onChange={(val) => setValue('minMarginPercent', val, { shouldValidate: true, shouldDirty: true })}
                      suffixSymbol="%"
                      suffixClassName="font-bold"
                      placeholder="30"
                      containerClassName={cn(
                        'mt-2 flex min-h-11 h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-3 transition focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500 dark:focus-within:bg-gray-800 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500/20',
                        CANONICAL_FOCUS_CLASSES
                      )}
                      className="text-right font-bold text-gray-900 dark:text-white dark:placeholder-gray-500"
                      error={errors.minMarginPercent?.message}
                    />
                    <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      Margen personalizado para este producto.
                    </p>
                  </div>
                </div>

                {/* Recién con el perfil cargado: sin el margen global, la frase quedaba a medias (#431). */}
                {!isLoadingUser && defaultMinMarginPercent !== undefined && (
                  <div className="flex items-center gap-2.5 rounded-2xl bg-indigo-50/70 p-3 text-xs text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/60">
                    <Info className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <p className="leading-tight">
                      <strong>Margen Inicial:</strong> Se aplicó automáticamente tu margen global de{' '}
                      <strong>{formatPercent(defaultMinMarginPercent, { minDecimals: 0 })}</strong>. Podés ajustarlo
                      exclusivamente para este producto sin alterar el resto.
                    </p>
                  </div>
                )}
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
                  <RecipeIngredientCombobox
                    supplies={supplies}
                    selectedSupply={selectedSupply}
                    existingIngredientIds={existingIngredientIds}
                    isOpen={isDropdownOpen}
                    onOpenChange={setIsDropdownOpen}
                    onSelect={handleSelectSupply}
                    onOpenQuickCreate={(initialName) => {
                      setQuickCreateInitialName(initialName)
                      setIsQuickCreateOpen(true)
                    }}
                    label="Seleccionar Insumo de la Despensa"
                    disabled={isLoadingSupplies}
                    emptyMessage="No se encontraron insumos con ese nombre."
                    labelClassName="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5"
                    triggerClassName="flex min-h-11 h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-bold text-gray-900 shadow-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 cursor-pointer"
                    triggerRef={comboboxTriggerRef}
                  />

                  <div className="mt-3.5 flex items-center gap-2">
                    <div className="flex-1">
                      <label htmlFor="new-product-recipe-qty" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                        Cantidad utilizada
                      </label>
                      <NumericInput
                        id="new-product-recipe-qty"
                        aria-label="Cantidad utilizada"
                        value={inputQty}
                        onChange={setInputQty}
                        maxDecimals={3}
                        placeholder="100"
                        containerClassName={cn(
                          'min-h-11 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-800 focus-within:border-indigo-600 dark:focus-within:border-indigo-500',
                          CANONICAL_FOCUS_CLASSES
                        )}
                        className="text-sm font-bold text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="w-28 sm:w-36">
                      <label htmlFor="new-product-recipe-unit" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                        Unidad
                      </label>
                      <select
                        id="new-product-recipe-unit"
                        aria-label="Unidad de medida de receta"
                        value={recipeUnit}
                        onChange={(e) => setRecipeUnit(e.target.value)}
                        className={cn(
                          'min-h-11 h-11 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:[color-scheme:dark] dark:hover:bg-gray-700 outline-none focus:border-indigo-600 dark:focus:border-indigo-500',
                          CANONICAL_FOCUS_CLASSES
                        )}
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
                    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-indigo-50/80 p-3 text-xs font-semibold text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200">
                      <div className="flex items-center justify-between">
                        <span>
                          Equivalencia: <strong>{formatQuantityWithUnit(previewNumericQty, recipeUnit)}</strong> (
                          {formatQuantityWithUnit(previewBaseQty, selectedSupply.unit)})
                        </span>
                        <span>
                          Subtotal:{' '}
                          <strong className="font-extrabold text-indigo-700 dark:text-indigo-300">
                            {money(previewSubtotal)}
                          </strong>
                        </span>
                      </div>
                      {previewBaseQty <= 0 ? (
                        <p className="font-bold text-rose-600 dark:text-rose-400">
                          ⚠️ La cantidad es menor al mínimo que se puede guardar (0,001 {formatUnit(selectedSupply.unit)}).
                        </p>
                      ) : (
                        precisionLost && (
                          <p className="font-bold text-amber-600 dark:text-amber-400">
                            ⚠️ La cantidad es demasiado pequeña y se redondeará a{' '}
                            {formatQuantityWithUnit(previewBaseQty, selectedSupply.unit)}.
                          </p>
                        )
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    disabled={isLoadingSupplies || !selectedSupply || previewBaseQty <= 0}
                    className={cn(
                      'mt-3.5 flex min-h-11 h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50',
                      CANONICAL_FOCUS_CLASSES
                    )}
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
                    Todavía no sumaste insumos a esta receta. El producto se guardará en estado{' '}
                    <strong>{HEALTH_BUCKET_META.draft.label}</strong> (sin receta).
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/50 p-2 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/40">
                    {items.map(
                      (item: {
                        ingredientId: string
                        quantity: number
                        unitCost: number
                        name: string
                        inputQty?: number
                        recipeUnit?: string
                        unit: string
                      }) => {
                        const itemSubtotal = item.quantity * item.unitCost
                        const displayQty =
                          item.inputQty ??
                          convertToRecipeUnitQty(item.quantity, item.recipeUnit ?? item.unit, item.unit)

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
                                Costo base: {money(item.unitCost)} por {formatUnit(item.unit)}
                              </p>
                              {itemSubtotal > (Number(watchedSalePrice) || 0) && (Number(watchedSalePrice) || 0) > 0 && (
                                <p className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  ⚠️ El costo de esta línea supera el precio de venta.
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                              <RecipeQuantityField
                                ingredientName={item.name}
                                value={displayQty}
                                recipeUnit={item.recipeUnit ?? item.unit}
                                baseUnit={item.unit}
                                onChange={(qty, baseQty) =>
                                  handleUpdateQuantity(item.ingredientId, qty, item.recipeUnit ?? item.unit, baseQty)
                                }
                              />

                              <div className="text-right min-w-20">
                                <span className="block text-xs font-black text-gray-900 dark:text-gray-100">
                                  {money(itemSubtotal)}
                                </span>
                                <span className="text-[10px] text-gray-400">subtotal</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setIngredientToDelete({ id: item.ingredientId, name: item.name })}
                                className={cn(
                                  'flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 cursor-pointer',
                                  CANONICAL_FOCUS_CLASSES
                                )}
                                title="Remover insumo"
                                aria-label={`Eliminar ${item.name}`}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        )
                      }
                    )}
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
                  {bucket === 'draft' ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-gray-100 p-4 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      <span className="size-2.5 rounded-full bg-gray-400" aria-hidden="true" />
                      {statusMeta.label}: {statusMeta.description}
                    </div>
                  ) : bucket === 'loss' || bucket === 'risk' ? (
                    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40 animate-in fade-in">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-200/70 px-2.5 py-1 text-xs font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                          <AlertTriangle className="size-3.5" aria-hidden="true" /> {statusMeta.label}
                        </span>
                        <span className="text-2xl font-black text-rose-700 dark:text-rose-300">
                          {formatPercent(marginPercent)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-400">
                        {bucket === 'loss'
                          ? `Venta a pérdida: Estás perdiendo ${formatMoney(Math.abs(marginAmount))} por unidad.`
                          : `El margen está por debajo del umbral personalizado (${formatPercent(targetMargin, { minDecimals: 0 })}).`}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40 animate-in fade-in">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/70 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          <ShieldCheck className="size-3.5" aria-hidden="true" /> {statusMeta.label}
                        </span>
                        <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                          {formatPercent(marginPercent)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {bucket === 'surplus'
                          ? `Supera el objetivo de rentabilidad (${formatPercent(targetMargin, { minDecimals: 0 })}) y el 60 %.`
                          : `Cumple el objetivo de rentabilidad (${formatPercent(targetMargin, { minDecimals: 0 })}).`}
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
                    <strong className="font-extrabold text-gray-900 dark:text-white">
                      {money(Number(watchedSalePrice) || 0)}
                    </strong>
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

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Ajustes Rápidos de Precio</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustPriceFactor(1.05, '5')}
                      className={cn(
                        'min-h-11 rounded-xl border py-2 text-xs font-bold transition-all duration-150 cursor-pointer',
                        CANONICAL_FOCUS_CLASSES,
                        flashingKey === '5'
                          ? 'border-indigo-600 bg-indigo-600 text-white scale-95 shadow-inner'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {formatPercent(5, { signed: true, minDecimals: 0 })}
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPriceFactor(1.10, '10')}
                      className={cn(
                        'min-h-11 rounded-xl border py-2 text-xs font-bold transition-all duration-150 cursor-pointer',
                        CANONICAL_FOCUS_CLASSES,
                        flashingKey === '10'
                          ? 'border-indigo-600 bg-indigo-600 text-white scale-95 shadow-inner'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {formatPercent(10, { signed: true, minDecimals: 0 })}
                    </button>
                    <button
                      type="button"
                      disabled={items.length === 0 || totalCost <= 0}
                      onClick={() => applySuggestedMargin(targetMargin)}
                      className={cn(
                        'min-h-11 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50',
                        CANONICAL_FOCUS_CLASSES,
                        activeStrategy === 'target'
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-indigo-600 bg-transparent text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950'
                      )}
                    >
                      Sugerir {formatPercent(targetMargin, { minDecimals: 0 })}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'hidden lg:flex min-h-12 h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50',
                    CANONICAL_FOCUS_CLASSES
                  )}
                >
                  {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className={`fixed inset-x-0 ${ABOVE_BOTTOM_NAV_CLASS} md:bottom-0 z-10 border-t border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95`}>
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">
                  Precio: <strong className="text-gray-900 dark:text-gray-100">{money(Number(watchedSalePrice) || 0)}</strong>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Ganancia:{' '}
                  <strong
                    className={
                      marginAmount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }
                  >
                    {money(marginAmount)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MarginBadge
                  marginPercent={marginPercent}
                  minMarginPercent={targetMargin}
                  hasRecipe={items.length > 0}
                  ingredientsCount={items.length}
                  size="sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex min-h-11 h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              {isSubmitting && <LoaderCircle className="size-3.5 mr-1.5 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </footer>
      </form>
      <BottomNav />

      <ProductRemoveIngredientDialog
        ingredientName={ingredientToDelete?.name ?? null}
        onClose={() => setIngredientToDelete(null)}
        onConfirm={confirmRemoveItem}
      />

      <UnsavedChangesDialog open={showDialog} onConfirm={confirmNavigation} onCancel={cancelNavigation} />

      <QuickCreateIngredientModal
        isOpen={isQuickCreateOpen}
        initialName={quickCreateInitialName}
        onClose={() => {
          setIsQuickCreateOpen(false)
          comboboxTriggerRef.current?.focus()
        }}
        onCreated={handleQuickCreated}
      />
    </main>
  )
}