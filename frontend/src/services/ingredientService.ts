import { fetchApi, type TokenGetter } from './api'

export interface Ingredient {
  id: string
  name: string
  unit: string
  currentCost: number
  updatedAt?: string
}

export interface PriceHistory {
  id: string
  ingredientId: string
  oldCost: number
  newCost: number
  changedAt: string
}

type RawIngredient = Omit<Ingredient, 'currentCost'> & { currentCost: number | string }
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

interface HistoryResponse {
  history: RawPriceHistory[]
}

export interface IngredientInput {
  name: string
  unit: string
  currentCost: number
}

function normalizeIngredient(ingredient: RawIngredient): Ingredient {
  return { ...ingredient, currentCost: Number(ingredient.currentCost) }
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

  async update(getToken: TokenGetter, id: string, input: IngredientInput): Promise<Ingredient> {
    const response = await fetchApi<SingleIngredientResponse>(`/ingredients/${id}`, getToken, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    return normalizeIngredient(response.ingredient)
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