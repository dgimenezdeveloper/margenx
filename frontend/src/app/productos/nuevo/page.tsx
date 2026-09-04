'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/navbar'

const initialSupplies = [
  { name: 'Carne Picada', unit: 'kg', cost: 4200 },
  { name: 'Pan Brioche', unit: 'unidad', cost: 950 },
  { name: 'Queso Cheddar', unit: 'kg', cost: 6800 },
  { name: 'Papas Congeladas', unit: 'kg', cost: 2400 },
  { name: 'Bacon Ahumado', unit: 'kg', cost: 5000 },
  { name: 'Harina 0000', unit: 'kg', cost: 1200 },
  { name: 'Hipoclorito de Sodio', unit: 'litro', cost: 800 },
  { name: 'Envase 5L', unit: 'unidad', cost: 650 }
]

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

function getAvailableRecipeUnits(baseUnit: string): string[] {
  if (baseUnit === 'kg') return ['gr', 'kg']
  if (baseUnit === 'litro') return ['ml', 'litro']
  return [baseUnit || 'unidad']
}

function convertToBaseQty(qty: number, selectedUnit: string, baseUnit: string): number {
  if (baseUnit === 'kg' && selectedUnit === 'gr') return qty / 1000
  if (baseUnit === 'litro' && selectedUnit === 'ml') return qty / 1000
  return qty
}

export default function NewProductPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [minimum, setMinimum] = useState('30')
  const [toast, setToast] = useState<string | null>(null)

  const [selectedIngredient, setSelectedIngredient] = useState(initialSupplies[0]?.name ?? '')
  const [recipeUnit, setRecipeUnit] = useState('gr')
  const [inputQty, setInputQty] = useState('200')

  const currentSupply = initialSupplies.find((s) => s.name === selectedIngredient) || initialSupplies[0]
  const availableUnits = getAvailableRecipeUnits(currentSupply?.unit ?? 'kg')

  const [recipe, setRecipe] = useState<{ supply: typeof initialSupplies[0]; inputQty: number; recipeUnit: string; baseQty: number }[]>([
    { supply: initialSupplies[0], inputQty: 200, recipeUnit: 'gr', baseQty: 0.2 },
    { supply: initialSupplies[1], inputQty: 1, recipeUnit: 'unidad', baseQty: 1 }
  ])

  const notify = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3000)
  }

  const cost = recipe.reduce((total, item) => total + item.supply.cost * item.baseQty, 0)
  const salePrice = Number(price) || 0
  const projected = salePrice > 0 ? Math.round(((salePrice - cost) / salePrice) * 1000) / 10 : 0
  const isHealthy = projected >= Number(minimum)

  const handleSupplyChange = (supplyName: string) => {
    setSelectedIngredient(supplyName)
    const sup = initialSupplies.find((s) => s.name === supplyName)
    if (sup) {
      const units = getAvailableRecipeUnits(sup.unit)
      setRecipeUnit(units[0])
    }
  }

  const handleAddIngredient = () => {
    const numQty = Number(inputQty)
    if (currentSupply && numQty > 0) {
      const baseQty = convertToBaseQty(numQty, recipeUnit, currentSupply.unit)
      setRecipe([...recipe, { supply: currentSupply, inputQty: numQty, recipeUnit, baseQty }])
      setInputQty('')
      notify(`"${currentSupply.name}" agregado a la receta`)
    }
  }

  const handleSaveProduct = () => {
    if (!name.trim() || salePrice <= 0 || recipe.length === 0) return
    notify('Producto creado con éxito')
    setTimeout(() => router.push('/productos'), 800)
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-44 pt-5 text-gray-900 md:px-8 md:pb-12 lg:px-12 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4">
          <Check className="size-5" />
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl">
        <Navbar title="Nuevo Producto" backHref="/productos" />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          {/* Sección 1: Datos Básicos */}
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <h2 className="text-base font-bold">1. Datos Básicos</h2>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
              Nombre del producto
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Bidón Lavandina 5L / Docena Medialunas"
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white dark:border-gray-700 dark:bg-gray-800"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                Precio de Venta
                <div className="mt-2 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-3 focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800">
                  <span className="text-gray-400 font-bold">$</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="decimal"
                    type="number"
                    placeholder="0"
                    className="no-spinners w-full bg-transparent px-2 text-base font-bold outline-none"
                  />
                </div>
              </label>

              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                Margen Mínimo (%)
                <div className="mt-2 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-3 focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800">
                  <input
                    value={minimum}
                    onChange={(e) => setMinimum(e.target.value)}
                    inputMode="decimal"
                    type="number"
                    className="no-spinners w-full bg-transparent text-right font-bold outline-none"
                  />
                  <span className="text-gray-400 font-bold ml-1">%</span>
                </div>
              </label>
            </div>
          </section>

          {/* Sección 2: Constructor de Receta (BOM) */}
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-bold mb-3">2. Composición / Receta</h2>
            
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <label className="block text-xs font-bold text-gray-500">Insumo de la despensa</label>
              <select
                value={selectedIngredient}
                onChange={(e) => handleSupplyChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold outline-none dark:border-gray-700 dark:bg-gray-900"
              >
                {initialSupplies.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} (${s.cost.toLocaleString('es-AR')} por {s.unit})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Cantidad en receta</label>
                  <input
                    value={inputQty}
                    onChange={(e) => setInputQty(e.target.value)}
                    placeholder="200"
                    inputMode="decimal"
                    type="number"
                    className="no-spinners h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Unidad</label>
                  <select
                    value={recipeUnit}
                    onChange={(e) => setRecipeUnit(e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-2 text-xs font-bold outline-none dark:border-gray-700 dark:bg-gray-900"
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
                <p className="text-[11px] font-semibold text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/50 p-2.5 rounded-xl">
                  ℹ️ {inputQty} {recipeUnit} = {convertToBaseQty(Number(inputQty), recipeUnit, currentSupply.unit)} {currentSupply.unit} · Subtotal: {money(currentSupply.cost * convertToBaseQty(Number(inputQty), recipeUnit, currentSupply.unit))}
                </p>
              )}

              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Plus className="size-4" />
                Agregar Insumo a la Receta
              </button>
            </div>

            {/* Lista de Insumos agregados */}
            {recipe.length > 0 && (
              <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800 pt-2">
                {recipe.map((item, index) => (
                  <div key={`${item.supply.name}-${index}`} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <strong className="block text-sm">{item.supply.name}</strong>
                      <span className="text-xs text-gray-400">
                        {item.inputQty} {item.recipeUnit} ({item.baseQty} {item.supply.unit}) · Subtotal: {money(item.supply.cost * item.baseQty)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecipe(recipe.filter((_, i) => i !== index))}
                      className="p-1 text-rose-500 hover:text-rose-700"
                      aria-label="Eliminar ingrediente"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Sticky Footer con Cálculo en Vivo */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white/95 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 shadow-lg">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 md:max-w-5xl lg:max-w-6xl">
          <div>
            <p className="text-xs text-gray-500">
              Costo Total: <strong>{money(cost)}</strong>
            </p>
            <p className={`text-sm font-bold ${isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>
              Margen: {projected}% {isHealthy ? '✅' : '⚠️'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveProduct}
            className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
          >
            Guardar Producto
          </button>
        </div>
      </footer>
    </main>
  )
}