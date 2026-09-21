import { create } from 'zustand'

export interface RecipeItem {
  ingredientId: string
  name: string
  unit: string // Unidad base del insumo (kg, l, u)
  unitCost: number // Costo por unidad base
  quantity: number // Cantidad base calculada (ej: 0.2 para 200g)
  recipeUnit?: string // Unidad visible en receta (gr, kg, ml, l, u)
  inputQty?: number // Cantidad numérica escrita por el usuario
}

export interface RecipeState {
  items: RecipeItem[]
  salePrice: number
  minMarginPercent: number

  // Acciones
  addIngredient: (item: RecipeItem) => void
  removeIngredient: (ingredientId: string) => void
  updateQuantity: (
    ingredientId: string,
    quantity: number,
    inputQty?: number,
    recipeUnit?: string
  ) => void
  setSalePrice: (salePrice: number) => void
  setMinMarginPercent: (minMarginPercent: number) => void
  reset: () => void

  // Selectores computados
  totalCost: () => number
  marginAmount: () => number
  marginPercent: () => number
  isUnderMargin: () => boolean
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  items: [],
  salePrice: 0,
  minMarginPercent: 30,

  addIngredient: (newItem: RecipeItem) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.ingredientId === newItem.ingredientId
      )

      if (existingIndex >= 0) {
        const updated = [...state.items]
        const existing = updated[existingIndex]
        if (existing) {
          updated[existingIndex] = {
            ...existing,
            quantity: existing.quantity + newItem.quantity,
            inputQty: (existing.inputQty ?? existing.quantity) + (newItem.inputQty ?? newItem.quantity),
          }
        }
        return { items: updated }
      }

      return { items: [...state.items, newItem] }
    })
  },

  removeIngredient: (ingredientId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.ingredientId !== ingredientId),
    }))
  },

  updateQuantity: (ingredientId, quantity, inputQty, recipeUnit) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.ingredientId === ingredientId) {
          return {
            ...item,
            quantity,
            inputQty: inputQty !== undefined ? inputQty : item.inputQty,
            recipeUnit: recipeUnit !== undefined ? recipeUnit : item.recipeUnit,
          }
        }
        return item
      }),
    }))
  },

  setSalePrice: (salePrice: number) => {
    set({ salePrice: Number.isFinite(salePrice) ? Math.max(0, salePrice) : 0 })
  },

  setMinMarginPercent: (minMarginPercent: number) => {
    set({
      minMarginPercent: Number.isFinite(minMarginPercent)
        ? Math.max(0, minMarginPercent)
        : 0,
    })
  },

  reset: () => {
    set({ items: [], salePrice: 0, minMarginPercent: 30 })
  },

  totalCost: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  },

  marginAmount: () => {
    const { salePrice, totalCost, items } = get()
    if (items.length === 0 || salePrice <= 0) return 0
    return salePrice - totalCost()
  },

  marginPercent: () => {
    const { salePrice, totalCost, items } = get()
    if (items.length === 0 || salePrice <= 0) return 0
    const cost = totalCost()
    const rawMargin = ((salePrice - cost) / salePrice) * 100
    return Math.round(rawMargin * 10) / 10
  },

  isUnderMargin: () => {
    const { items, minMarginPercent, marginPercent } = get()
    if (items.length === 0) return false
    return marginPercent() < minMarginPercent
  },
}))

// Selectores externos puros para consumo atómico y optimización de renderizados
export const selectTotalCost = (state: RecipeState) => state.totalCost()
export const selectMarginAmount = (state: RecipeState) => state.marginAmount()
export const selectMarginPercent = (state: RecipeState) => state.marginPercent()
export const selectIsUnderMargin = (state: RecipeState) => state.isUnderMargin()