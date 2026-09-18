'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Check, Pencil, Plus, Trash2, X, Package, LoaderCircle } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { useRouter } from '@/shims/next-navigation'
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
  const router = useRouter()
  const { getToken } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [product, setProduct] = useState<Product | null>(null)
  const [availablePantry, setAvailablePantry] = useState<Ingredient[]>([])

  const [price, setPrice] = useState('')
  const [productName, setProductName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [selectedSupplyId, setSelectedSupplyId] = useState('')
  const [recipeUnit, setRecipeUnit] = useState('gr')
  const [inputQty, setInputQty] = useState('50')
  const [recipe, setRecipe] = useState<RecipeItem[]>([])

  const notify = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!id) return

    let active = true
    Promise.all([
      productService.getById(getToken, id),
      ingredientService.getAll(getToken)
    ])
      .then(([prodData, ingredientsData]) => {
        if (!active) return
        setProduct(prodData)
        setAvailablePantry(ingredientsData)

        setProductName(prodData.name)
        setTempName(prodData.name)
        setPrice(String(prodData.salePrice))

        const mappedRecipe = prodData.ingredients.map(pi => ({
          id: pi.ingredientId,
          name: pi.ingredient?.name || 'Insumo desconocido',
          baseUnit: pi.ingredient?.unit || 'u',
          recipeUnit: pi.ingredient?.unit || 'u',
          inputQty: pi.quantity,
          baseQty: pi.quantity,
          cost: pi.ingredient?.currentCost || 0
        }))
        setRecipe(mappedRecipe)

        if (ingredientsData.length > 0) {
          setSelectedSupplyId(ingredientsData[0].id)
          setRecipeUnit(getAvailableRecipeUnits(ingredientsData[0].unit)[0])
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Error al cargar el producto')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [id, getToken])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pt-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex items-center justify-center">
        <LoaderCircle className="size-8 animate-spin text-indigo-600" />
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pt-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl">
          <Navbar title="Producto no encontrado" backHref="/productos" />
          <div className="mt-10">
            <EmptyState
              icon={<Package className="size-6" />}
              title="Producto no encontrado"
              description="El producto que intentas buscar no existe o fue eliminado."
              actionLabel="Volver al catálogo"
              onAction={() => router.push('/productos')}
            />
          </div>
        </div>
        <BottomNav />
      </main>
    )
  }

  const currentSupply = availablePantry.find((p) => p.id === selectedSupplyId) || availablePantry[0]
  const availableUnits = currentSupply ? getAvailableRecipeUnits(currentSupply.unit) : ['u']

  const cost = recipe.reduce((sum, item) => sum + item.baseQty * item.cost, 0)
  const sale = Number(price) || 0
  const margin = sale > 0 ? Math.round(((sale - cost) / sale) * 1000) / 10 : 0
  const gain = sale - cost
  const isHealthy = margin >= product.minMarginPercent

  const applyMargin = (targetPercentage: number) => {
    const suggestedPrice = Math.round(cost / (1 - targetPercentage / 100))
    setPrice(String(suggestedPrice))
  }

  const adjustPrice = (factor: number) => {
    setPrice(String(Math.round(sale * factor)))
  }

  const handleSelectSupply = (supplyId: string) => {
    setSelectedSupplyId(supplyId)
    const item = availablePantry.find((p) => p.id === supplyId)
    if (item) {
      const units = getAvailableRecipeUnits(item.unit)
      setRecipeUnit(units[0])
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
          cost: currentSupply.currentCost
        }
      ]

      try {
        await productService.update(getToken, id!, {
          ingredients: newRecipe.map(r => ({ ingredientId: r.id, quantity: r.baseQty }))
        })
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
      await productService.update(getToken, id!, {
        ingredients: newRecipe.map(r => ({ ingredientId: r.id, quantity: r.baseQty }))
      })
      setRecipe(newRecipe)
      notify('Insumo eliminado de la receta')
    } catch {
      notify('Error al actualizar la receta')
    }
  }

  const handleSaveName = async () => {
    try {
      await productService.update(getToken, id!, { name: tempName })
      setProductName(tempName)
      setEditingName(false)
      notify('Nombre actualizado')
    } catch {
      notify('Error al actualizar el nombre')
    }
  }

  const handleSavePrice = async () => {
    try {
      await productService.update(getToken, id!, { salePrice: Number(price) })
      notify('Precio guardado correctamente')
      setShowSheet(false)
    } catch {
      notify('Error al guardar el precio')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-36 pt-5 text-gray-900 md:px-8 md:pb-12 lg:px-12 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4">
          <Check className="size-5" />
          {toast}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-col gap-6 md:max-w-5xl lg:max-w-6xl">
        <Navbar title={productName} backHref="/productos" />

        {editingName && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 animate-in fade-in">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">Editar Nombre</label>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border bg-gray-50 px-4 text-sm font-semibold outline-none focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-800"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setEditingName(false)} className="flex-1 rounded-xl border py-2 text-xs font-bold cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-7">
            {isHealthy ? (
              <section className="mt-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 shadow-sm transition-all duration-300 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Margen actual
                  </p>
                  <button onClick={() => setEditingName(true)} className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 cursor-pointer">
                    <Pencil className="size-4" />
                  </button>
                </div>
                <p className="mt-2 text-5xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                  {margin}%
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Margen saludable (Objetivo: {product.minMarginPercent}%)
                </p>
              </section>
            ) : (
              <section className="mt-6 rounded-2xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm transition-all duration-300 dark:border-rose-900/60 dark:bg-rose-950/40">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    Margen actual
                  </p>
                  <button onClick={() => setEditingName(true)} className="text-rose-700 hover:text-rose-900 dark:text-rose-400 cursor-pointer">
                    <Pencil className="size-4" />
                  </button>
                </div>
                <p className="mt-2 text-5xl font-black tracking-tight text-rose-700 dark:text-rose-300">
                  {margin}%
                </p>
                <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-400">
                  Por debajo del mínimo ({product.minMarginPercent}%)
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Composición / Receta</h2>
                <span className="text-xs font-semibold text-gray-400">{recipe.length} ingredientes</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recipe.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between py-3.5 text-sm">
                    <div>
                      <strong className="block font-bold">{item.name}</strong>
                      <span className="text-xs text-gray-500">
                        {item.inputQty} {item.recipeUnit} ({item.baseQty} {item.baseUnit}) · Subtotal: {money(item.baseQty * item.cost)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => handleRemoveIngredient(index)} className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setShowAddModal(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 py-3.5 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50/50 dark:border-indigo-800 dark:text-indigo-400 cursor-pointer">
                <Plus className="size-4" /> Agregar Insumo a la Receta
              </button>
            </section>
          </div>

          <div className="hidden lg:col-span-5 lg:sticky lg:top-6 lg:block">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-800 dark:bg-gray-900 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Simulador de Precio</h3>
                  <p className="text-base font-black text-gray-900 dark:text-white mt-1">Costo Total: {money(cost)}</p>
                </div>
                <span className={`text-sm font-black ${gain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Ganancia: {money(gain)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Ajustes Rápidos</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => adjustPrice(1.05)} className="rounded-xl border py-2.5 text-xs font-bold hover:bg-gray-50 dark:border-gray-700 cursor-pointer">+5%</button>
                  <button type="button" onClick={() => adjustPrice(1.10)} className="rounded-xl border py-2.5 text-xs font-bold hover:bg-gray-50 dark:border-gray-700 cursor-pointer">+10%</button>
                  <button type="button" onClick={() => applyMargin(product.minMarginPercent)} className="rounded-xl bg-indigo-50 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 cursor-pointer">Sugerir {product.minMarginPercent}%</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Precio de Venta</label>
                <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800">
                  <span className="text-lg font-bold text-gray-400">$</span>
                  <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))} inputMode="decimal" type="number" className="no-spinners w-full bg-transparent px-2 text-lg font-bold outline-none" />
                </div>
              </div>

              <p className={`text-xs font-bold ${margin >= product.minMarginPercent ? 'text-emerald-700' : 'text-rose-700'}`}>Proyección: Nuevo margen {margin}% {margin >= product.minMarginPercent ? '✅' : '⚠️'}</p>

              <button type="button" onClick={handleSavePrice} className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 cursor-pointer">
                Guardar Precio
              </button>
            </div>
          </div>
        </div>
      </div>

      {!showSheet && (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto flex h-14 max-w-md items-center justify-between border-t border-gray-100 bg-white/95 px-5 shadow-sm backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-medium text-gray-500">Costo: {money(cost)}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              Ganancia: <strong className={gain >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{money(gain)}</strong>
            </span>
          </div>
          <button type="button" onClick={() => setShowSheet(true)} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer">
            <Pencil className="size-3.5" /> Ajustar Precio
          </button>
        </div>
      )}

      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowSheet(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>SIMULADOR DE PRECIO (Costo: {money(cost)})</span>
              <span className={gain >= 0 ? 'text-sm font-bold text-emerald-700' : 'text-sm font-bold text-rose-700'}>Ganancia: {money(gain)}</span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => adjustPrice(1.05)} className="rounded-xl border py-2.5 text-xs font-bold hover:bg-gray-50 dark:border-gray-700 cursor-pointer">+5%</button>
              <button type="button" onClick={() => adjustPrice(1.10)} className="rounded-xl border py-2.5 text-xs font-bold hover:bg-gray-50 dark:border-gray-700 cursor-pointer">+10%</button>
              <button type="button" onClick={() => applyMargin(product.minMarginPercent)} className="rounded-xl border border-indigo-100 bg-indigo-50 py-2.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950 cursor-pointer">Sugerir {product.minMarginPercent}%</button>
            </div>
            <label className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">
              Precio de Venta
              <div className="mt-1 flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-indigo-600 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800">
                <span className="text-lg font-bold text-gray-400">$</span>
                <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))} inputMode="decimal" type="number" className="no-spinners w-full bg-transparent px-2 text-lg font-bold outline-none" />
              </div>
            </label>
            <p className={`mt-2 text-xs font-bold ${margin >= product.minMarginPercent ? 'text-emerald-700' : 'text-rose-700'}`}>Proyección: Nuevo margen {margin}%</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowSheet(false)} className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 cursor-pointer">Cancelar</button>
              <button type="button" onClick={handleSavePrice} className="flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer">Guardar Precio</button>
            </div>
          </div>
        </div>
      )}

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
              <button type="button" onClick={() => setShowAddModal(false)} className="rounded-full p-1 text-gray-400 cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                Seleccionar Insumo
                <select value={selectedSupplyId} onChange={(e) => handleSelectSupply(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-800 outline-none">
                  {availablePantry.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.unit}) - {money(item.currentCost)}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Cantidad utilizada</label>
                  <input value={inputQty} onChange={(e) => setInputQty(e.target.value)} inputMode="decimal" type="number" placeholder="50" className="no-spinners h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-800 outline-none focus:border-indigo-600" />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Unidad</label>
                  <select value={recipeUnit} onChange={(e) => setRecipeUnit(e.target.value)} className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 outline-none focus:border-indigo-600">
                    {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {Number(inputQty) > 0 && currentSupply && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <p className="font-semibold">Equivalencia: <strong>{inputQty} {recipeUnit} = {convertToBaseQty(Number(inputQty), recipeUnit, currentSupply.unit)} {currentSupply.unit}</strong></p>
                  <p className="mt-1 font-bold text-indigo-700 dark:text-indigo-300">Subtotal en receta: {money(currentSupply.currentCost * convertToBaseQty(Number(inputQty), recipeUnit, currentSupply.unit))}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 cursor-pointer">Cancelar</button>
              <button type="button" onClick={handleAddIngredient} className="flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer">Agregar</button>
            </div>
          </section>
        </div>
      )}

      <BottomNav />
    </main>
  )
}