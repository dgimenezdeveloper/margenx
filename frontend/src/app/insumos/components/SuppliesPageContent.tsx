'use client'

import { useAuth } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Boxes, FileSpreadsheet, LoaderCircle, Plus, Search, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { Pagination } from '@/components/pagination'
import { ErrorState } from '@/components/error-state'
import { Navbar } from '@/components/navbar'
import { PriceHistoryModal } from '@/components/price-history-modal'
import { SupplierPackagingModal } from '@/components/supplier-packaging-modal'
import { ToastAlert } from '@/components/ToastAlert'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { handleDecimalARKeyDown, sanitizeDecimalAR } from '@/lib/numericInput'
import { formatMoney } from '@/lib/format'
import { formatNumeroAR, parseNumeroAR } from '@/lib/numericFormat'
import { TOAST_DURATION_MS } from '@/lib/toast'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import type { PageParams } from '@/services/pagination'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { ingredientSchema, type IngredientFormValues } from '@/schemas/ingredientSchema'
import { ApiError } from '@/services/api'
import {
  defaultPresentationMismatch,
  ingredientService,
  type DefaultPresentationAction,
  type DefaultPresentationConflict,
  type Ingredient,
  type IngredientProductUsage,
} from '@/services/ingredientService'
import { supplierService, type SupplierIngredient } from '@/services/supplierService'
import { BulkIngredientsModal } from './BulkIngredientsModal'
import { MakeDefaultDialog } from '@/components/make-default-dialog'
import { bulkUploadNotice } from '@/lib/bulkUploadNotice'
import { IngredientUpsertSheet } from './IngredientUpsertSheet'
import { DefaultPresentationDialog } from './DefaultPresentationDialog'
import { SuppliesCardsMobile } from './SuppliesCardsMobile'
import { SuppliesTableDesktop } from './SuppliesTableDesktop'

/** "Cargar desde planilla" (escritorio y celular): respuesta visible al pasar el mouse y foco canónico (#362). */
const BULK_BUTTON_HOVER_CLASSES = `transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-700 dark:hover:bg-gray-700 dark:hover:text-indigo-300 ${CANONICAL_FOCUS_CLASSES}`

const MAX_INGREDIENT_COST = 99_999_999.99
const money = (val: number) => formatMoney(val)
/** "Se usa en" lista hasta esta cantidad de productos; el contador usa el total real (meta.total). */
const USED_PRODUCTS_LIMIT = 100

let toastIdCounter = 0

interface ToastMsg {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
}

export default function SuppliesPageContent() {
  const { getToken } = useAuth()
  const { user } = useCurrentUser()
  const navigate = useNavigate()
  const isCollaborator = user?.role === 'COLLABORATOR'
  const canBulkUpload = user?.role === 'ADMIN'

  const fetchSupplies = useCallback((params: PageParams) => ingredientService.list(getToken, params), [getToken])
  const {
    items: supplies,
    meta,
    catalogTotal,
    error: loadError,
    isLoading,
    isLoadingMore,
    page,
    limit,
    search: query,
    appliedSearch,
    hasMore,
    setSearch: setQuery,
    goToPage,
    setLimit,
    loadMore,
    reload: reloadSupplies,
    setItems: setSupplies,
  } = usePaginatedList(fetchSupplies, { errorMessage: 'No se pudieron cargar los insumos.' })

  const [quarantineCount, setQuarantineCount] = useState(0)
  // Si la consulta de cuarentena falla, la tarjeta lo dice en lugar de mostrar 0 ([RV385-I1]).
  const [quarantineError, setQuarantineError] = useState(false)
  const [quarantineReloadKey, setQuarantineReloadKey] = useState(0)
  const [bulkCatalog, setBulkCatalog] = useState<Ingredient[]>([])
  const [selected, setSelected] = useState<Ingredient | null>(null)
  // Costo manual que contradice la presentación predeterminada: lo que se quiso guardar y la presentación (#427).
  const [presentationConflict, setPresentationConflict] = useState<{
    data: z.input<typeof ingredientSchema>
    cost: number
    presentation: DefaultPresentationConflict
  } | null>(null)
  const [savingAction, setSavingAction] = useState<DefaultPresentationAction | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showPackagingModal, setShowPackagingModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingConnection, setEditingConnection] = useState<SupplierIngredient | undefined>(undefined)

  const [usedProducts, setUsedProducts] = useState<IngredientProductUsage[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  // Total real de productos que usan el insumo (meta.total): la lista trae hasta USED_PRODUCTS_LIMIT.
  const [usedProductsTotal, setUsedProductsTotal] = useState(0)
  // La consulta falló: no se sabe si el insumo se usa, así que no se muestra "no se usa".
  const [productsError, setProductsError] = useState(false)

  const [toastQueue, setToastQueue] = useState<ToastMsg[]>([])
  const [currentToast, setCurrentToast] = useState<ToastMsg | null>(null)

  const handleRetry = reloadSupplies

  const toCostInput = (val: number | string) => formatNumeroAR(val)

  const handleCostBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseNumeroAR(event.target.value)
    if (parsed !== '') {
      const formatted = formatNumeroAR(parsed)
      setValue('currentCost', formatted, { shouldValidate: true })
    }
  }

  const openBulkModal = () => {
    ingredientService
      .getAll(getToken)
      .then(setBulkCatalog)
      .catch(() => setBulkCatalog([]))
      .finally(() => setShowBulkModal(true))
  }

  useEffect(() => {
    if (isCollaborator) return
    let active = true
    supplierService
      .getQuarantine(getToken)
      .then((quarantined) => {
        if (!active) return
        setQuarantineCount(quarantined.length)
        setQuarantineError(false)
      })
      .catch(() => {
        if (active) setQuarantineError(true)
      })
    return () => {
      active = false
    }
  }, [getToken, isCollaborator, quarantineReloadKey])

  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      const timeout = setTimeout(() => {
        const nextToast = toastQueue[0]
        setCurrentToast(nextToast)
        setToastQueue((prev) => prev.slice(1))
      }, 150)

      return () => clearTimeout(timeout)
    }
  }, [currentToast, toastQueue])

  useEffect(() => {
    if (!currentToast) return

    // Los errores y advertencias quedan más tiempo que los éxitos (#364).
    const timer = setTimeout(() => {
      setCurrentToast(null)
    }, TOAST_DURATION_MS[currentToast.type])

    return () => clearTimeout(timer)
  }, [currentToast])

  const notify = (
    messageOrTitle: string,
    typeOrDescription?: string,
    maybeType?: 'success' | 'error' | 'warning' | 'info'
  ) => {
    const isKnownType = (val?: string): val is 'success' | 'error' | 'warning' | 'info' =>
      val === 'success' || val === 'error' || val === 'warning' || val === 'info'

    const title = messageOrTitle
    let description: string | undefined = undefined
    let type: 'success' | 'error' | 'warning' | 'info' = 'success'

    if (isKnownType(typeOrDescription)) {
      type = typeOrDescription
    } else {
      description = typeOrDescription
      if (isKnownType(maybeType)) {
        type = maybeType
      }
    }

    const id = String(++toastIdCounter)
    setToastQueue((prev) => [...prev, { id, title, description, type }])
  }

  const handleDismissCurrentToast = () => {
    setCurrentToast(null)
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof ingredientSchema>>({
    resolver: zodResolver(ingredientSchema),
    mode: 'onChange',
    defaultValues: { name: '', unit: 'kg', currentCost: '' },
  })

  // Con la ficha abierta y cambios sin guardar, salir de la pantalla o cerrar la pestaña pide confirmación (#364).
  const isSheetOpen = selected !== null || newOpen
  const {
    showDialog: showLeaveConfirm,
    confirmNavigation: confirmLeave,
    cancelNavigation: cancelLeave,
  } = useUnsavedChangesWarning(isSheetOpen && isDirty)

  const selectedUnit = useWatch({ control, name: 'unit' })

  const isTotalEmpty = !isLoading && meta?.total === 0 && !appliedSearch
  const isSearchEmpty = !isLoading && meta?.total === 0 && Boolean(appliedSearch)

  const resetUsedProducts = () => {
    setUsedProducts([])
    setUsedProductsTotal(0)
    setProductsError(false)
    setIsLoadingProducts(false)
  }

  const loadUsedProducts = (ingredientId: string) => {
    setIsLoadingProducts(true)
    setProductsError(false)
    ingredientService
      .getProducts(getToken, ingredientId, { page: 1, limit: USED_PRODUCTS_LIMIT })
      .then((res) => {
        setUsedProducts(res.data)
        setUsedProductsTotal(res.meta.total)
      })
      .catch(() => {
        setUsedProducts([])
        setUsedProductsTotal(0)
        setProductsError(true)
      })
      .finally(() => {
        setIsLoadingProducts(false)
      })
  }

  const handleOpenEdit = (supply: Ingredient) => {
    setSelected(supply)
    setShowDeleteConfirm(false)
    setPresentationConflict(null)
    const formUnit = supply.unit === 'l' ? 'litro' : supply.unit === 'u' ? 'unidad' : supply.unit
    reset({ name: supply.name, unit: formUnit as IngredientFormValues['unit'], currentCost: toCostInput(supply.currentCost) })

    // GET /api/ingredients/:id/products es solo ADMIN: el colaborador no lo consulta ni ve la sección.
    if (isCollaborator) {
      resetUsedProducts()
      return
    }
    loadUsedProducts(supply.id)
  }

  const handleOpenNew = () => {
    setSelected(null)
    setShowDeleteConfirm(false)
    setPresentationConflict(null)
    resetUsedProducts()
    reset({ name: '', unit: 'kg', currentCost: '' })
    setNewOpen(true)
  }

  const handleCloseSheet = () => {
    setSelected(null)
    setNewOpen(false)
    setShowDeleteConfirm(false)
    setPresentationConflict(null)
    resetUsedProducts()
    reset({ name: '', unit: 'kg', currentCost: '' })
  }

  const requestCloseSheet = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    handleCloseSheet()
  }

  const executeSave = async (data: z.input<typeof ingredientSchema>, defaultPresentationAction?: DefaultPresentationAction) => {
    const rawCost = typeof data.currentCost === 'string' ? parseNumeroAR(data.currentCost) : data.currentCost
    const numericCost = Number(rawCost)
    if (!Number.isFinite(numericCost) || numericCost <= 0 || numericCost > MAX_INGREDIENT_COST) {
      notify('El insumo no puede superar $99.999.999,99.', 'error')
      return
    }

    const canonicalUnit = data.unit === 'litro' ? 'l' : data.unit === 'unidad' ? 'u' : data.unit
    const input = {
      name: data.name.trim(),
      unit: canonicalUnit,
      currentCost: numericCost,
      ...(defaultPresentationAction ? { defaultPresentationAction } : {}),
    }

    try {
      if (selected) {
        const response = await ingredientService.update(getToken, selected.id, input)
        // La respuesta del PUT no trae los proveedores: se conservan los que ya tenía el insumo, así la
        // ficha los sigue mostrando sin recargar la página (#427).
        const ingredient = { ...response.ingredient, supplierConnections: selected.supplierConnections }

        setSupplies((current) => current.map((item) => (item.id === ingredient.id ? ingredient : item)))
        setSelected(ingredient)
        setPresentationConflict(null)
        // Con una acción sobre la presentación predeterminada, el precio del bulto o la marca de predeterminada
        // los calcula el backend: se vuelve a pedir la lista para mostrarlos como quedaron.
        if (defaultPresentationAction) reloadSupplies()

        notify(
          `Insumo "${ingredient.name}" actualizado correctamente`,
          // El costo que guardó el backend: con "Actualizar el precio" y un bulto fraccionario puede diferir en
          // centavos del tipeado (ADR-011).
          `Nuevo valor: ${money(ingredient.currentCost)}`,
          'success'
        )

        if (response.affectedProductsCount > 0) {
          notify(
            `Se actualizaron los costos de ${response.affectedProductsCount} recetas vinculadas.`,
            'info'
          )
        }

        if (response.criticalProducts && response.criticalProducts.length > 0) {
          notify(
            '¡Atención!',
            `${response.criticalProducts.length} productos quedaron con margen por debajo de su objetivo.`,
            'warning'
          )
        }
      } else {
        await ingredientService.create(getToken, input)
        reloadSupplies()
        notify(`Insumo "${data.name}" creado correctamente`, 'success')
      }
      handleCloseSheet()
    } catch (error: unknown) {
      // El costo manual contradice la presentación predeterminada: el dueño elige qué hacer (#427, ADR-011).
      const conflict = defaultPresentationMismatch(error)
      if (conflict && !defaultPresentationAction) {
        setPresentationConflict({ data, cost: numericCost, presentation: conflict })
        return
      }
      setPresentationConflict(null)
      if (error instanceof ApiError && error.status === 409) {
        if (/unidad/i.test(error.message)) {
          setError('unit', { type: 'server', message: error.message })
        } else {
          setError('name', { type: 'server', message: error.message }, { shouldFocus: true })
        }
        return
      }
      notify(error instanceof ApiError ? error.message : 'No se pudo guardar el insumo.', 'error')
    }
  }

  // Desde #426 el backend responde 409 si cambia la unidad de un insumo usado, y executeSave lo muestra en la
  // ficha: ya no hace falta confirmar el cambio de unidad antes de guardar.
  const handleSave = async (data: z.input<typeof ingredientSchema>) => {
    await executeSave(data)
  }

  const confirmDelete = async () => {
    if (!selected) return
    try {
      await ingredientService.delete(getToken, selected.id)
      reloadSupplies()
      notify(`Insumo "${selected.name}" eliminado correctamente.`, 'success')
      handleCloseSheet()
    } catch (error: unknown) {
      notify(error instanceof ApiError ? error.message : 'No se pudo eliminar el insumo.', 'error')
      setShowDeleteConfirm(false)
    }
  }

  const handlePackagingSuccess = (newCost?: number, newConnection?: SupplierIngredient) => {
    if (!selected) return
    let updatedConnections = [...(selected.supplierConnections || [])]

    if (newConnection) {
      const existingIndex = updatedConnections.findIndex((item) => item.supplierId === newConnection.supplierId)
      if (existingIndex >= 0) updatedConnections[existingIndex] = newConnection
      else updatedConnections.push(newConnection)

      if (newConnection.isDefault) {
        updatedConnections = updatedConnections.map((item) => ({ ...item, isDefault: item.id === newConnection.id }))
      }
    }

    const updatedIngredient = {
      ...selected,
      currentCost: newCost ?? selected.currentCost,
      supplierConnections: updatedConnections,
    }
    setSupplies((current) => current.map((item) => (item.id === selected.id ? updatedIngredient : item)))
    setSelected(updatedIngredient)

    if (newCost !== undefined) {
      setValue('currentCost', toCostInput(newCost), { shouldDirty: false })
      notify(`Presentación vinculada y costo actualizado a ${money(newCost)} por ser la presentación predeterminada.`, 'success')
    } else {
      notify('Presentación mayorista asociada correctamente al proveedor.', 'success')
    }
  }

  // Presentación que espera confirmación antes de pasar a ser la predeterminada (#434).
  const [defaultCandidate, setDefaultCandidate] = useState<SupplierIngredient | null>(null)
  const [isSettingDefault, setIsSettingDefault] = useState(false)

  const handleMakeDefault = async (conn: SupplierIngredient) => {
    setIsSettingDefault(true)
    try {
      const result = await supplierService.addPackaging(getToken, conn.supplierId, {
        ingredientId: selected!.id,
        packageSize: conn.packageSize,
        packageUnit: conn.packageUnit as 'kg' | 'l' | 'u',
        packagePrice: conn.packagePrice,
        isDefault: true,
        // El alta reemplaza la presentación entera: sin estos dos campos se borran y se corta la ingesta de precios (#486).
        supplierCode: conn.supplierCode ?? null,
        rawDescription: conn.rawDescription ?? null,
      })

      const newCost = typeof result.unitCost === 'number' ? result.unitCost : Number(result.unitCost)
      const updatedConnections =
        selected!.supplierConnections?.map((item) => ({ ...item, isDefault: item.id === conn.id })) || []
      const updatedIngredient = { ...selected!, currentCost: newCost, supplierConnections: updatedConnections }

      setSupplies((current) => current.map((item) => (item.id === selected!.id ? updatedIngredient : item)))
      setSelected(updatedIngredient)
      setValue('currentCost', toCostInput(newCost), { shouldDirty: false })
      notify(
        `La presentación de ${conn.supplier?.name || 'este proveedor'} es la predeterminada. Costo actualizado a ${money(newCost)}.`,
        'success'
      )
    } catch (error: unknown) {
      notify(error instanceof ApiError ? error.message : 'No se pudo cambiar la presentación predeterminada.', 'error')
    } finally {
      setIsSettingDefault(false)
      setDefaultCandidate(null)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {currentToast && (
        <ToastAlert
          key={currentToast.id}
          title={currentToast.title}
          description={currentToast.description}
          type={currentToast.type}
          onClose={handleDismissCurrentToast}
        />
      )}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar />
          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Insumos</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Administra los costos de tus materias primas y sus presentaciones mayoristas.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
              <div className="relative w-full md:w-72 lg:w-80 shrink-0">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Search className="size-4 text-gray-400" />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar insumos..."
                  aria-label="Buscar insumos por nombre"
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                />
              </div>
              {/* Orden del encabezado (#362): Cuarentena es navegación; las dos altas van juntas y la principal al final. */}
              {!isCollaborator && (
                <button
                  type="button"
                  onClick={() => navigate('/proveedores/cuarentena')}
                  className="hidden md:inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40"
                >
                  <ShieldAlert className="size-4" />
                  Cuarentena
                  {quarantineCount > 0 && (
                    <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">
                      {quarantineCount}
                    </span>
                  )}
                </button>
              )}
              {canBulkUpload && (
                <button
                  type="button"
                  onClick={openBulkModal}
                  aria-label="Cargar desde planilla"
                  className={`hidden md:inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-sm dark:text-gray-200 ${BULK_BUTTON_HOVER_CLASSES}`}
                >
                  <FileSpreadsheet className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <span className="lg:hidden">Planilla</span>
                  <span className="hidden lg:inline">Cargar desde planilla</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenNew}
                className="hidden md:inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
              >
                <Plus className="size-4" /> Nuevo Insumo
              </button>
            </div>
          </section>

          {loadError ? (
            <ErrorState
              title="Error al cargar insumos"
              description={loadError}
              onRetry={handleRetry}
            />
          ) : (
            <>
              {!isCollaborator && quarantineCount > 0 && (
                <div className="md:hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                      <ShieldAlert className="size-5" />
                      <span className="text-sm font-bold">Precios en Cuarentena ({quarantineCount})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/proveedores/cuarentena')}
                      className="text-xs font-bold text-amber-700 underline dark:text-amber-300 cursor-pointer"
                    >
                      Revisar
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/60">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Insumos activos</p>
                  <p className="mt-1 text-2xl font-black text-indigo-950 dark:text-indigo-100">{catalogTotal ?? 0}</p>
                </div>
                {/* Solo para el ADMIN: al colaborador no se le consulta la cuarentena ([RV385-I1]). */}
                {!isCollaborator && (
                  <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950/60">
                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Variaciones recientes</p>
                    {quarantineError ? (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-bold text-rose-950 dark:text-rose-100">No se pudo cargar</p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuarantineError(false)
                            setQuarantineReloadKey((key) => key + 1)
                          }}
                          className={`min-h-11 cursor-pointer text-xs font-bold text-rose-800 underline dark:text-rose-200 ${CANONICAL_FOCUS_CLASSES}`}
                        >
                          Reintentar
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-2xl font-black text-rose-950 dark:text-rose-100">{quarantineCount}</p>
                    )}
                  </div>
                )}
              </div>

              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="min-w-0 truncate text-lg font-bold">Todos los insumos</h2>
                  <div className="flex shrink-0 items-center gap-2 md:hidden">
                    {canBulkUpload && (
                      <button
                        type="button"
                        onClick={openBulkModal}
                        aria-label="Cargar desde planilla"
                        title="Cargar desde planilla"
                        className={`flex size-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-indigo-600 shadow-sm dark:text-indigo-400 ${BULK_BUTTON_HOVER_CLASSES}`}
                      >
                        <FileSpreadsheet className="size-5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleOpenNew}
                      className="min-h-11 rounded-xl bg-indigo-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      + Nuevo Insumo
                    </button>
                  </div>
                </div>
                {isLoading && (
                  <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 text-sm font-semibold text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <LoaderCircle className="mr-2 size-5 animate-spin" /> Cargando insumos...
                  </div>
                )}
                {!isLoading && isTotalEmpty && (
                  <EmptyState
                    icon={<Boxes className="size-6" />}
                    title="Sin insumos en la despensa"
                    description="Agregá tus materias primas para poder armar las recetas y calcular los costos de tus productos."
                    actionLabel="Crear nuevo insumo"
                    onAction={handleOpenNew}
                  />
                )}
                {!isLoading && isTotalEmpty && canBulkUpload && (
                  <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                    ¿Tenés tu lista en Excel?{' '}
                    <button
                      type="button"
                      onClick={openBulkModal}
                      className="min-h-11 cursor-pointer font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-300"
                    >
                      Cargala desde una planilla
                    </button>
                  </p>
                )}
                {!isLoading && isSearchEmpty && (
                  <EmptyState
                    icon={<Search className="size-6" />}
                    title="Insumo no encontrado"
                    description={`No existe ningún insumo con el nombre "${appliedSearch}".`}
                  />
                )}
                {!isLoading && !isTotalEmpty && !isSearchEmpty && (
                  <>
                    <SuppliesCardsMobile supplies={supplies} onSelect={handleOpenEdit} money={money} />
                    <SuppliesTableDesktop supplies={supplies} onSelect={handleOpenEdit} money={money} />
                    {meta && (
                      <Pagination
                        page={page}
                        totalPages={meta.totalPages}
                        total={meta.total}
                        limit={limit}
                        shown={supplies.length}
                        itemLabel="insumos"
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onPageChange={goToPage}
                        onLimitChange={setLimit}
                        onLoadMore={loadMore}
                      />
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </div>
        <DesktopFooter />
      </div>
      <BottomNav />
      <IngredientUpsertSheet
        selected={selected}
        newOpen={newOpen}
        showDeleteConfirm={showDeleteConfirm}
        isCollaborator={isCollaborator}
        onSubmit={handleSubmit(handleSave)}
        onRequestClose={requestCloseSheet}
        onRequestDelete={() => setShowDeleteConfirm(true)}
        onDeleteConfirm={confirmDelete}
        onCancelDelete={() => setShowDeleteConfirm(false)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenPackaging={() => {
          setEditingConnection(undefined)
          setShowPackagingModal(true)
        }}
        onEditConnection={(connection) => {
          setEditingConnection(connection)
          setShowPackagingModal(true)
        }}
        onMakeDefault={setDefaultCandidate}
        register={register}
        setValue={setValue}
        errors={errors}
        selectedUnit={selectedUnit}
        money={money}
        onNumericKeyDown={handleDecimalARKeyDown}
        onDecimalChange={(event) => {
          const clean = sanitizeDecimalAR(event.target.value)
          setValue('currentCost', clean, { shouldValidate: true, shouldDirty: true })
        }}
        onCostBlur={handleCostBlur}
        usedProducts={usedProducts}
        usedProductsTotal={usedProductsTotal}
        isLoadingProducts={isLoadingProducts}
        productsError={productsError}
        onRetryProducts={() => {
          if (selected) loadUsedProducts(selected.id)
        }}
        showUsedProducts={!isCollaborator}
      />
      <UnsavedChangesDialog
        open={showDiscardConfirm}
        onConfirm={() => {
          setShowDiscardConfirm(false)
          handleCloseSheet()
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />
      <UnsavedChangesDialog open={showLeaveConfirm} onConfirm={confirmLeave} onCancel={cancelLeave} />
      <DefaultPresentationDialog
        presentation={presentationConflict?.presentation ?? null}
        newCost={presentationConflict?.cost ?? 0}
        unit={selected?.unit ?? ''}
        savingAction={savingAction}
        onChoose={(action) => {
          if (!presentationConflict) return
          setSavingAction(action)
          void executeSave(presentationConflict.data, action).finally(() => setSavingAction(null))
        }}
        onCancel={() => setPresentationConflict(null)}
      />
      {selected && (
        <PriceHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          ingredientId={selected.id}
          ingredientName={selected.name}
          ingredientUnit={selected.unit}
        />
      )}
      {selected && (
        <SupplierPackagingModal
          isOpen={showPackagingModal}
          onClose={() => setShowPackagingModal(false)}
          ingredient={selected}
          existingConnection={editingConnection}
          onSuccess={handlePackagingSuccess}
        />
      )}
      {canBulkUpload && (
        <BulkIngredientsModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          existingSupplies={bulkCatalog}
          onSuccess={(result) => {
            reloadSupplies()
            notify(bulkUploadNotice(result), result.created > 0 ? 'success' : 'info')
          }}
        />
      )}
      <MakeDefaultDialog
        open={defaultCandidate !== null}
        ingredientName={selected?.name ?? ''}
        supplierName={defaultCandidate?.supplier?.name ?? 'este proveedor'}
        currentSupplierName={selected?.supplierConnections?.find((conn) => conn.isDefault)?.supplier?.name ?? null}
        unitCost={defaultCandidate ? defaultCandidate.packagePrice / (defaultCandidate.packageSize || 1) : 0}
        unit={selected?.unit ?? ''}
        isSaving={isSettingDefault}
        onConfirm={() => {
          if (defaultCandidate) void handleMakeDefault(defaultCandidate)
        }}
        onCancel={() => setDefaultCandidate(null)}
      />
    </main>
  )
}