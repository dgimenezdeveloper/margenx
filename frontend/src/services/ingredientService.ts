import { fetchApi, type TokenGetter } from './api'

export interface Ingredient {
  id: string
  name: string
  unit: string
  currentCost: number
  updatedAt?: string
}

type RawIngredient = Omit<Ingredient, 'currentCost'> & { currentCost: number | string }

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

export interface IngredientInput {
  name: string
  unit: string
  currentCost: number
}

function normalizeIngredient(ingredient: RawIngredient): Ingredient {
  return { ...ingredient, currentCost: Number(ingredient.currentCost) }
}

export const ingredientService = {
  async getAll(getToken: TokenGetter): Promise<Ingredient[]> {
    const response = await fetchApi<IngredientResponse>('/ingredients', getToken)
    const list = response.data ?? response.ingredients ?? []
    return list.map(normalizeIngredient)
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
}