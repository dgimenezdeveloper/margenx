import { useState, useMemo } from 'react'
import { ChevronDown, LoaderCircle, Plus, Search, X } from 'lucide-react'
import type { Ingredient } from '@/services/ingredientService'
import { NumericInput } from '@/components/NumericInput'

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

export interface ProductAddIngredientModalProps {
  isOpen: boolean
  onClose: () => void
  availablePantry: Ingredient[]
  isLoadingSupplies: boolean
  onAdd: (ingredient: Ingredient, inputQty: number, recipeUnit: string, baseQty: number) => Promise<void>
}

export function ProductAddIngredientModal({
  isOpen,
  onClose,
  availablePantry,
  isLoadingSupplies,
  onAdd,
}: ProductAddIngredientModalProps) {
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>(availablePantry[0]?.id || '')
  const [recipeUnit, setRecipeUnit] = useState<string>(() => {
    const supply = availablePantry[0]
    return supply ? (getAvailableRecipeUnits(supply.unit)[0] || 'kg') : 'gr'
  })
  const [inputQty, setInputQty] = useState<string>(() => {
    const unit = availablePantry[0] ? (getAvailableRecipeUnits(availablePantry[0].unit)[0] || 'kg') : 'gr'
    return unit === 'gr' ? '50' : unit === 'ml' ? '30' : '1'
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

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

  const handleSelectSupply = (supply: Ingredient) => {
    setSelectedSupplyId(supply.id)
    const units = getAvailableRecipeUnits(supply.unit)
    setRecipeUnit(units[0] || supply.unit)
    setInputQty(units[0] === 'gr' ? '50' : units[0] === 'ml' ? '30' : '1')
    setIsDropdownOpen(false)
    setSearchQuery('')
  }

  const handleAdd = async () => {
    const numQty = Number(inputQty)
    if (!currentSupply || numQty <= 0) return

    setIsAdding(true)
    const baseQty = convertToBaseQty(numQty, recipeUnit, currentSupply.unit)
    await onAdd(currentSupply, numQty, recipeUnit, baseQty)
    setIsAdding(false)
    setInputQty(recipeUnit === 'gr' ? '50' : recipeUnit === 'ml' ? '30' : '1')
  }

  if (!isOpen) return null

  const previewNumericQty = Number(inputQty) || 0
  const previewBaseQty = currentSupply ? convertToBaseQty(previewNumericQty, recipeUnit, currentSupply.unit) : 0
  const previewSubtotal = currentSupply ? previewBaseQty * currentSupply.currentCost : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs md:items-center animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <section className="relative z-10 w-full max-w-md rounded-t-3xl border border-transparent bg-white p-6 shadow-2xl md:rounded-3xl dark:border-gray-800 dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">Despensa</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Sumar Insumo a la Receta</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
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
              disabled={isLoadingSupplies || availablePantry.length === 0}
              className="mt-2 flex min-h-11 h-12 w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 text-left text-sm font-bold text-gray-900 shadow-xs transition hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
            >
              <span className="truncate">
                {currentSupply
                  ? `${currentSupply.name} (${money(currentSupply.currentCost)}/${currentSupply.unit})`
                  : 'Buscar insumo...'}
              </span>
              <ChevronDown className={`size-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 p-1 text-gray-400 hover:text-gray-600">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 p-1 dark:divide-gray-800">
                {filteredSupplies.length === 0 ? (
                  <div className="p-4 text-center text-xs font-semibold text-gray-400">No se encontraron insumos.</div>
                ) : (
                  filteredSupplies.map((supply) => (
                    <button
                      key={supply.id}
                      type="button"
                      onClick={() => handleSelectSupply(supply)}
                      className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer ${
                        supply.id === selectedSupplyId ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <span className="truncate">{supply.name}</span>
                      <span className="ml-2 shrink-0 text-gray-400">{money(supply.currentCost)}/{supply.unit}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Cantidad utilizada</label>
              <NumericInput
                value={inputQty}
                onChange={setInputQty}
                placeholder="50"
                containerClassName="min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 dark:border-gray-700 dark:bg-gray-800 focus-within:border-indigo-600 dark:focus-within:border-indigo-500"
                className="text-sm font-bold text-gray-900 dark:text-white"
              />
            </div>
            <div className="w-28 sm:w-36">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Unidad</label>
              <select
                value={recipeUnit}
                onChange={(e) => setRecipeUnit(e.target.value)}
                className="min-h-11 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
              >
                {availableUnits.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {previewNumericQty > 0 && currentSupply && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
              <p className="font-semibold">
                Equivalencia: <strong>{previewNumericQty} {recipeUnit} = {previewBaseQty} {currentSupply.unit}</strong>
              </p>
              <p className="mt-1 font-bold text-indigo-700 dark:text-indigo-300">
                Subtotal en receta: {money(previewSubtotal)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!currentSupply || previewNumericQty <= 0 || isAdding}
            className="min-h-11 flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAdding ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar
          </button>
        </div>
      </section>
    </div>
  )
}