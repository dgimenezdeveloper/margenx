'use client'

import { useAuth } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Boxes, LoaderCircle, Plus, Search, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { Navbar } from '@/components/navbar'
import { PriceHistoryModal } from '@/components/price-history-modal'
import { SupplierPackagingModal } from '@/components/supplier-packaging-modal'
import { ToastAlert } from '@/components/ToastAlert'
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { handleNumericKeyDown, sanitizeDecimal } from '@/lib/numericInput'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { ingredientSchema, type IngredientFormValues } from '@/schemas/ingredientSchema'
import { ApiError } from '@/services/api'
import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { supplierService, type SupplierIngredient } from '@/services/supplierService'
import { IngredientUpsertSheet } from './IngredientUpsertSheet'
import { SuppliesCardsMobile } from './SuppliesCardsMobile'
import { SuppliesTableDesktop } from './SuppliesTableDesktop'

const MAX_INGREDIENT_COST = 99_999_999.99
const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`
const sortIngredients = (ingredients: Ingredient[]) =>
  [...ingredients].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

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

  const [supplies, setSupplies] = useState<Ingredient[]>([])
  const [quarantineCount, setQuarantineCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Ingredient | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showPackagingModal, setShowPackagingModal] = useState(false)
  const [editingConnection, setEditingConnection] = useState<SupplierIngredient | undefined>(undefined)

  const [toastQueue, setToastQueue] = useState<ToastMsg[]>([])
  const [currentToast, setCurrentToast] = useState<ToastMsg | null>(null)

  useBodyScrollLock(newOpen || selected !== null || showHistoryModal || showPackagingModal)

  useEffect(() => {
    let active = true

    // Si getQuarantine falla, se captura silenciosamente devolviendo array vacío
    // para que la pantalla principal de insumos NUNCA sea bloqueada.
    Promise.all([
      ingredientService.getAll(getToken),
      !isCollaborator
        ? supplierService.getQuarantine(getToken).catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([ingredients, quarantined]) => {
        if (active) {
          setSupplies(sortIngredients(ingredients))
          setQuarantineCount(quarantined.length)
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof ApiError ? error.message : 'No se pudieron cargar los insumos.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [getToken, isCollaborator])

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

    const timer = setTimeout(() => {
      setCurrentToast(null)
    }, 3000)

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
    control,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof ingredientSchema>>({
    resolver: zodResolver(ingredientSchema),
    mode: 'onChange',
    defaultValues: { name: '', unit: 'kg', currentCost: '' },
  })

  const selectedUnit = useWatch({ control, name: 'unit' })
  const filtered = useMemo(
    () => supplies.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [supplies, query]
  )
  const isTotalEmpty = !isLoading && supplies.length === 0
  const isSearchEmpty = !isLoading && filtered.length === 0 && !isTotalEmpty

  const handleOpenEdit = (supply: Ingredient) => {
    setSelected(supply)
    setShowDeleteConfirm(false)
    const formUnit = supply.unit === 'l' ? 'litro' : supply.unit === 'u' ? 'unidad' : supply.unit
    reset({ name: supply.name, unit: formUnit as IngredientFormValues['unit'], currentCost: String(supply.currentCost) })
  }

  const handleOpenNew = () => {
    setSelected(null)
    setShowDeleteConfirm(false)
    reset({ name: '', unit: 'kg', currentCost: '' })
    setNewOpen(true)
  }

  const handleCloseSheet = () => {
    setSelected(null)
    setNewOpen(false)
    setShowDeleteConfirm(false)
    reset({ name: '', unit: 'kg', currentCost: '' })
  }

  const requestCloseSheet = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    handleCloseSheet()
  }

  const handleSave = async (data: z.input<typeof ingredientSchema>) => {
    const numericCost = Number(data.currentCost)
    if (!Number.isFinite(numericCost) || numericCost <= 0 || numericCost > MAX_INGREDIENT_COST) {
      notify('El insumo no puede superar $99.999.999,99.', 'error')
      return
    }

    const input = {
      name: selected?.name ?? data.name,
      unit: data.unit === 'litro' ? 'l' : data.unit === 'unidad' ? 'u' : data.unit,
      currentCost: numericCost,
    }

    try {
      if (selected) {
        const response = await ingredientService.update(getToken, selected.id, input)
        const ingredient = response.ingredient

        setSupplies((current) =>
          sortIngredients(current.map((item) => (item.id === ingredient.id ? ingredient : item)))
        )

        notify(
          `Costo de ${selected.name} actualizado`,
          `Nuevo valor: ${money(Number(data.currentCost))}`,
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
        const ingredient = await ingredientService.create(getToken, input)
        setSupplies((current) => sortIngredients([...current, ingredient]))
        notify(`Insumo "${data.name}" creado correctamente`, 'success')
      }
      handleCloseSheet()
    } catch (error: unknown) {
      notify(error instanceof ApiError ? error.message : 'No se pudo guardar el insumo.', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!selected) return
    try {
      await ingredientService.delete(getToken, selected.id)
      setSupplies((current) => current.filter((item) => item.id !== selected.id))
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
    setSupplies((current) =>
      sortIngredients(current.map((item) => (item.id === selected.id ? updatedIngredient : item)))
    )
    setSelected(updatedIngredient)

    if (newCost !== undefined) {
      setValue('currentCost', String(newCost), { shouldDirty: false })
      notify(`Presentación vinculada y costo activo actualizado a ${money(newCost)} por proveedor predeterminado.`, 'success')
    } else {
      notify('Presentación mayorista asociada correctamente al proveedor.', 'success')
    }
  }

  const handleMakeDefault = async (conn: SupplierIngredient) => {
    try {
      const result = await supplierService.addPackaging(getToken, conn.supplierId, {
        ingredientId: selected!.id,
        packageSize: conn.packageSize,
        packageUnit: conn.packageUnit as 'kg' | 'l' | 'u',
        packagePrice: conn.packagePrice,
        isDefault: true,
      })

      const newCost = typeof result.unitCost === 'number' ? result.unitCost : Number(result.unitCost)
      const updatedConnections =
        selected!.supplierConnections?.map((item) => ({ ...item, isDefault: item.id === conn.id })) || []
      const updatedIngredient = { ...selected!, currentCost: newCost, supplierConnections: updatedConnections }

      setSupplies((current) =>
        sortIngredients(current.map((item) => (item.id === selected!.id ? updatedIngredient : item)))
      )
      setSelected(updatedIngredient)
      setValue('currentCost', String(newCost), { shouldDirty: false })
      notify(
        `Proveedor ${conn.supplier?.name || 'seleccionado'} establecido como predeterminado. Costo activo actualizado a ${money(newCost)}.`,
        'success'
      )
    } catch (error: unknown) {
      notify(error instanceof ApiError ? error.message : 'Error al cambiar proveedor predeterminado.', 'error')
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
                Administra los costos de tus materias primas y empaques mayoristas.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:w-72 lg:w-80 shrink-0">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Search className="size-4 text-gray-400" />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar insumos..."
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                />
              </div>
              {!isCollaborator && (
                <button
                  type="button"
                  onClick={() => navigate('/proveedores/cuarentena')}
                  className="hidden md:inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
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
              <button
                type="button"
                onClick={handleOpenNew}
                className="hidden md:inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
              >
                <Plus className="size-4" /> Nuevo Insumo
              </button>
            </div>
          </section>

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

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/60">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Insumos activos</p>
              <p className="mt-1 text-2xl font-black text-indigo-950 dark:text-indigo-100">{supplies.length}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950/60">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Variaciones recientes</p>
              <p className="mt-1 text-2xl font-black text-rose-950 dark:text-rose-100">2</p>
            </div>
            <div className="hidden rounded-2xl bg-emerald-50 p-4 md:block dark:bg-emerald-950/60">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Recálculo</p>
              <p className="mt-1 text-2xl font-black text-emerald-950 dark:text-emerald-100">Activo</p>
            </div>
            <div className="hidden rounded-2xl bg-slate-100 p-4 md:block dark:bg-slate-900">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Afectan a</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">Catálogo general</p>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Todos los insumos</h2>
              <button
                type="button"
                onClick={handleOpenNew}
                className="md:hidden rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                + Nuevo Insumo
              </button>
            </div>
            {isLoading && (
              <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 text-sm font-semibold text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <LoaderCircle className="mr-2 size-5 animate-spin" /> Cargando insumos...
              </div>
            )}
            {!isLoading && loadError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {loadError}
              </div>
            )}
            {!isLoading && !loadError && isTotalEmpty && (
              <EmptyState
                icon={<Boxes className="size-6" />}
                title="Sin insumos en la despensa"
                description="Agrega tus materias primas para poder armar las recetas y calcular los costos de tus productos."
                actionLabel="Crear nuevo insumo"
                onAction={handleOpenNew}
              />
            )}
            {!isLoading && !loadError && isSearchEmpty && (
              <EmptyState
                icon={<Search className="size-6" />}
                title="Insumo no encontrado"
                description={`No existe ningún insumo con el nombre "${query}".`}
              />
            )}
            {!isLoading && !loadError && !isTotalEmpty && !isSearchEmpty && (
              <>
                <SuppliesCardsMobile supplies={filtered} onSelect={handleOpenEdit} money={money} />
                <SuppliesTableDesktop supplies={filtered} onSelect={handleOpenEdit} money={money} />
              </>
            )}
          </section>
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
        onClose={requestCloseSheet}
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
        onMakeDefault={handleMakeDefault}
        register={register}
        setValue={setValue}
        errors={errors}
        selectedUnit={selectedUnit}
        money={money}
        onNumericKeyDown={handleNumericKeyDown}
        onDecimalChange={(event) => {
          const clean = sanitizeDecimal(event.target.value)
          setValue('currentCost', clean, { shouldValidate: true, shouldDirty: true })
        }}
      />
      <UnsavedChangesDialog
        open={showDiscardConfirm}
        onConfirm={() => {
          setShowDiscardConfirm(false)
          handleCloseSheet()
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />
      {selected && (
        <PriceHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          ingredientId={selected.id}
          ingredientName={selected.name}
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
    </main>
  )
}