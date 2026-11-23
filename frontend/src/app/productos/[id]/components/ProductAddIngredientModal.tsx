import { useMemo, useRef, useState } from 'react'
import { LoaderCircle, Plus, X } from 'lucide-react'
import type { Ingredient } from '@/services/ingredientService'
import { NumericInput } from '@/components/NumericInput'
import { QuickCreateIngredientModal } from '@/components/quick-create-ingredient-modal'
import { RecipeIngredientCombobox } from '@/components/recipe-ingredient-combobox'
import { Dialog, DialogBackdrop, DialogClose, DialogDescription, DialogPortal, DialogSheet, DialogTitle } from '@/components/ui/dialog'
import { formatMoney, formatQuantityWithUnit, formatUnit } from '@/lib/format'
import { convertToBaseQty, getAvailableRecipeUnits } from '@/lib/recipeConversion'

const money = (val: number) => formatMoney(val)

export interface ProductAddIngredientModalProps {
  isOpen: boolean
  onClose: () => void
  availablePantry: Ingredient[]
  existingIngredientIds?: readonly string[]
  isLoadingSupplies: boolean
  onAdd: (ingredient: Ingredient, inputQty: number, recipeUnit: string, baseQty: number) => Promise<void>
  onIngredientCreated?: (ingredient: Ingredient) => void
}

function defaultQtyForUnit(unit: string): string {
  if (unit === 'gr') return '50'
  if (unit === 'ml') return '30'
  return '1'
}

export function ProductAddIngredientModal({
  isOpen,
  onClose,
  availablePantry,
  existingIngredientIds = [],
  isLoadingSupplies,
  onAdd,
  onIngredientCreated,
}: ProductAddIngredientModalProps) {
  const existingSet = useMemo(() => new Set(existingIngredientIds), [existingIngredientIds])
  const firstAvailable = useMemo(() => availablePantry.find((item) => !existingSet.has(item.id)), [availablePantry, existingSet])
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>(() => firstAvailable?.id ?? '')
  const [recipeUnit, setRecipeUnit] = useState<string>(() => firstAvailable ? (getAvailableRecipeUnits(firstAvailable.unit)[0] || 'kg') : 'gr')
  const [inputQty, setInputQty] = useState<string>(() => {
    const unit = firstAvailable ? (getAvailableRecipeUnits(firstAvailable.unit)[0] || 'kg') : 'gr'
    return defaultQtyForUnit(unit)
  })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [pickedSupply, setPickedSupply] = useState<Ingredient | null>(null)
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [quickCreateInitialName, setQuickCreateInitialName] = useState('')
  const comboboxTriggerRef = useRef<HTMLButtonElement | null>(null)

  const currentSupply = useMemo(() => {
    if (!selectedSupplyId || existingSet.has(selectedSupplyId)) return undefined
    return (pickedSupply?.id === selectedSupplyId ? pickedSupply : undefined) ?? availablePantry.find((p) => p.id === selectedSupplyId)
  }, [availablePantry, existingSet, pickedSupply, selectedSupplyId])

  const availableUnits = useMemo(() => currentSupply ? getAvailableRecipeUnits(currentSupply.unit) : ['u'], [currentSupply])

  const handleSelectSupply = (supply: Ingredient) => {
    setPickedSupply(supply)
    setSelectedSupplyId(supply.id)
    const units = getAvailableRecipeUnits(supply.unit)
    const nextUnit = units[0] || supply.unit
    setRecipeUnit(nextUnit)
    setInputQty(defaultQtyForUnit(nextUnit))
  }

  const handleQuickCreated = (created: Ingredient) => {
    handleSelectSupply(created)
    setIsQuickCreateOpen(false)
    onIngredientCreated?.(created)
    comboboxTriggerRef.current?.focus()
  }

  const handleAdd = async () => {
    const numQty = Number(inputQty)
    if (!currentSupply || existingSet.has(currentSupply.id) || numQty <= 0) return
    const { baseQty } = convertToBaseQty(numQty, recipeUnit, currentSupply.unit)
    if (baseQty <= 0) return
    setIsAdding(true)
    await onAdd(currentSupply, numQty, recipeUnit, baseQty)
    setIsAdding(false)
    setInputQty(defaultQtyForUnit(recipeUnit))
  }

  if (!isOpen) return null

  const previewNumericQty = Number(inputQty) || 0
  const { baseQty: previewBaseQty, precisionLost } = currentSupply
    ? convertToBaseQty(previewNumericQty, recipeUnit, currentSupply.unit)
    : { baseQty: 0, precisionLost: false }
  const previewSubtotal = currentSupply ? previewBaseQty * currentSupply.currentCost : 0

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open, eventDetails) => {
          if (!open) {
            if (isQuickCreateOpen) return
            if (isDropdownOpen && eventDetails?.reason === 'escape-key') {
              eventDetails.cancel?.()
              setIsDropdownOpen(false)
              comboboxTriggerRef.current?.focus()
              return
            }
            onClose()
          }
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogSheet>
            <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />
            <div className="flex shrink-0 items-start justify-between pb-4">
              <div>
                <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">Despensa</p>
                <DialogTitle className="mt-1 text-xl">Sumar Insumo a la Receta</DialogTitle>
                <DialogDescription className="sr-only">Elegí un insumo de la despensa y la cantidad que usa la receta.</DialogDescription>
              </div>
              <DialogClose aria-label="Cerrar sumar insumo" className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full p-2 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800"><X className="size-5" /></DialogClose>
            </div>

            <div className="flex-1 space-y-4 pr-2">
              <RecipeIngredientCombobox
                supplies={availablePantry}
                selectedSupply={currentSupply}
                existingIngredientIds={existingIngredientIds}
                isOpen={isDropdownOpen}
                onOpenChange={setIsDropdownOpen}
                onSelect={handleSelectSupply}
                onOpenQuickCreate={(initialName) => { setQuickCreateInitialName(initialName); setIsQuickCreateOpen(true) }}
                label="Seleccionar Insumo"
                disabled={isLoadingSupplies}
                emptyMessage="No se encontraron insumos."
                triggerRef={comboboxTriggerRef}
              />

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label htmlFor="recipe-quantity-input" className="mb-2 block text-xs font-bold text-gray-600 dark:text-gray-300">Cantidad utilizada</label>
                  <NumericInput id="recipe-quantity-input" aria-label="Cantidad utilizada" value={inputQty} onChange={setInputQty} maxDecimals={3} placeholder="50" containerClassName="mt-2 min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-500" className="text-sm font-bold text-gray-900 dark:text-white" />
                </div>
                <div className="w-28 sm:w-36">
                  <label htmlFor="recipe-unit-select" className="mb-2 block text-xs font-bold text-gray-600 dark:text-gray-300">Unidad</label>
                  <select id="recipe-unit-select" value={recipeUnit} onChange={(e) => setRecipeUnit(e.target.value)} className="min-h-11 h-12 w-full cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-900 outline-none transition hover:bg-white focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:[color-scheme:dark] dark:hover:bg-gray-700 dark:focus:border-indigo-500">
                    {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {previewNumericQty > 0 && currentSupply && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <p className="font-semibold">Equivalencia: <strong>{formatQuantityWithUnit(previewNumericQty, recipeUnit)} = {formatQuantityWithUnit(previewBaseQty, currentSupply.unit)}</strong></p>
                  <p className="mt-1 font-bold text-indigo-700 dark:text-indigo-300">Subtotal en receta: {money(previewSubtotal)}</p>
                  {previewBaseQty <= 0 ? <p className="mt-2 font-bold text-rose-600 dark:text-rose-400">⚠️ La cantidad es menor al mínimo que se puede guardar (0,001 {formatUnit(currentSupply.unit)}).</p> : precisionLost && <p className="mt-2 font-bold text-amber-600 dark:text-amber-400">⚠️ La cantidad es demasiado pequeña y se redondeará a {formatQuantityWithUnit(previewBaseQty, currentSupply.unit)}.</p>}
                </div>
              )}
            </div>

            <div className="mt-6 flex shrink-0 gap-3 pt-2">
              <DialogClose className="min-h-11 flex-1 cursor-pointer rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Cancelar</DialogClose>
              <button type="button" onClick={handleAdd} disabled={!currentSupply || previewBaseQty <= 0 || isAdding} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50">
                {isAdding ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Agregar
              </button>
            </div>
          </DialogSheet>
        </DialogPortal>
      </Dialog>

      <QuickCreateIngredientModal isOpen={isQuickCreateOpen} initialName={quickCreateInitialName} onClose={() => { setIsQuickCreateOpen(false); comboboxTriggerRef.current?.focus() }} onCreated={handleQuickCreated} />
    </>
  )
}