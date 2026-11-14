import { Plus, Trash2 } from 'lucide-react'
import type { RecipeItem } from '@/stores/useRecipeStore'
import { convertToRecipeUnitQty } from '@/lib/recipeConversion'
import { RecipeQuantityField } from './RecipeQuantityField'
import { formatMoney, formatUnit } from '@/lib/format'

const money = (val: number) => formatMoney(val)

export interface ProductRecipeBOMProps {
  isCollaborator: boolean
  items: RecipeItem[]
  salePrice: number
  onAddIngredient: () => void
  onRemoveIngredient: (id: string, name: string) => void
  onUpdateQuantity?: (id: string, inputQty: number, recipeUnit: string, baseQty: number) => void
}

export function ProductRecipeBOM({
  isCollaborator,
  items,
  salePrice,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateQuantity,
}: ProductRecipeBOMProps) {
  const hasRecipe = items.length > 0

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Composición / Receta</h2>
        <span className="text-xs font-semibold text-gray-400">
          {items.length} {items.length === 1 ? 'ingrediente' : 'ingredientes'}
        </span>
      </div>

      {!hasRecipe ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400 dark:border-gray-800">
          Sin insumos cargados.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => {
            const itemSubtotal = item.quantity * item.unitCost
            const displayQty =
              item.inputQty ??
              convertToRecipeUnitQty(item.quantity, item.recipeUnit ?? item.unit, item.unit)

            return (
              <div
                key={item.ingredientId}
                className="flex flex-col gap-2 py-3.5 transition sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </strong>
                  {!isCollaborator && (
                    <p className="text-xs text-gray-400">
                      Costo base: {money(item.unitCost)} por {formatUnit(item.unit)}
                    </p>
                  )}
                  {itemSubtotal > salePrice && salePrice > 0 && !isCollaborator && (
                    <p className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ El costo de esta línea supera el precio de venta.
                    </p>
                  )}
                </div>

                {!isCollaborator && (
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <RecipeQuantityField
                      ingredientName={item.name}
                      value={displayQty}
                      recipeUnit={item.recipeUnit ?? item.unit}
                      baseUnit={item.unit}
                      onChange={(inputQty, baseQty) =>
                        onUpdateQuantity?.(item.ingredientId, inputQty, item.recipeUnit ?? item.unit, baseQty)
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
                      onClick={() => onRemoveIngredient(item.ingredientId, item.name)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 cursor-pointer"
                      title="Remover insumo"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isCollaborator && (
        <button
          type="button"
          onClick={onAddIngredient}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 py-3 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50/50 dark:border-indigo-800 dark:text-indigo-400 cursor-pointer"
        >
          <Plus className="size-4" /> Agregar Insumo a la Receta
        </button>
      )}
    </section>
  )
}
