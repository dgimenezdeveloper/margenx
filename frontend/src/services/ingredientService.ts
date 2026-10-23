import { fetchApi, type TokenGetter } from './api'
import { type SupplierIngredient } from './supplierService'

export interface Ingredient {
  id: string
  name: string
  unit: string
  currentCost: number
  updatedAt?: string
  supplierConnections?: SupplierIngredient[]
}

export interface PriceHistory {
  id: string
  ingredientId: string
  oldCost: number
  newCost: number
  changedAt: string
}

export interface CriticalProduct {
  productId: string
  productName: string
  previousCost: string
  newCost: string
  currentMarginPercent: string
  minMarginPercent: string
}

export interface IngredientUpdateResponse {
  ingredient: Ingredient
  affectedProductsCount: number
  criticalProducts: CriticalProduct[]
}

type RawIngredient = Omit<Ingredient, 'currentCost' | 'supplierConnections'> & {
  currentCost: number | string
  supplierConnections?: Array<Omit<SupplierIngredient, 'packageSize' | 'packagePrice'> & {
    packageSize: number | string
    packagePrice: number | string
  }>
}
type RawPriceHistory = Omit<PriceHistory, 'oldCost' | 'newCost'> & { oldCost: number | string; newCost: number | string }

interface IngredientResponse {
  data?: RawIngredient[]
  ingredients?: RawIngredient[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface SingleIngredientResponse {
  ingredient: RawIngredient
}

interface UpdateIngredientResponse {
  ingredient: RawIngredient
  affectedProductsCount?: number
  criticalProducts?: CriticalProduct[]
}

interface HistoryResponse {
  history: RawPriceHistory[]
}

export interface IngredientInput {
  name: string
  unit: string
  currentCost: number
}

function normalizeIngredient(ingredient: RawIngredient & { suppliers?: unknown[] }): Ingredient {
  const rawConnections =
    (ingredient.suppliers as SupplierIngredient[] | undefined) ??
    ingredient.supplierConnections ??
    []

  return {
    ...ingredient,
    currentCost: Number(ingredient.currentCost),
    supplierConnections: rawConnections.map((conn) => ({
      ...conn,
      packageSize: Number(conn.packageSize),
      packagePrice: Number(conn.packagePrice),
    })),
  }
}

function normalizeHistory(history: RawPriceHistory): PriceHistory {
  return { ...history, oldCost: Number(history.oldCost), newCost: Number(history.newCost) }
}

export const ingredientService = {
  async getAll(getToken: TokenGetter): Promise<Ingredient[]> {
    const response = await fetchApi<IngredientResponse>('/ingredients', getToken)
    const list = response.data ?? response.ingredients ?? []
    return list.map(normalizeIngredient)
  },

  async getById(getToken: TokenGetter, id: string): Promise<Ingredient> {
    const response = await fetchApi<SingleIngredientResponse>(`/ingredients/${id}`, getToken)
    return normalizeIngredient(response.ingredient)
  },

  async create(getToken: TokenGetter, input: IngredientInput): Promise<Ingredient> {
    const response = await fetchApi<SingleIngredientResponse>('/ingredients', getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return normalizeIngredient(response.ingredient)
  },

  async update(getToken: TokenGetter, id: string, input: IngredientInput): Promise<IngredientUpdateResponse> {
    const response = await fetchApi<UpdateIngredientResponse>(`/ingredients/${id}`, getToken, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    return {
      ingredient: normalizeIngredient(response.ingredient),
      affectedProductsCount: response.affectedProductsCount || 0,
      criticalProducts: response.criticalProducts || []
    }
  },

  async delete(getToken: TokenGetter, id: string): Promise<void> {
    await fetchApi(`/ingredients/${id}`, getToken, {
      method: 'DELETE',
    })
  },

  async getHistory(getToken: TokenGetter, id: string): Promise<PriceHistory[]> {
    const response = await fetchApi<HistoryResponse>(`/ingredients/${id}/history`, getToken)
    return (response.history || []).map(normalizeHistory)
  }
}