import { fetchApi, type TokenGetter } from './api'

export interface Ingredient {
  id: string
  name: string
  unit: string
  currentCost: number
  updatedAt?: string
}

interface IngredientResponse {
  ingredients: Array<Omit<Ingredient, 'currentCost'> & { currentCost: number | string }>
}

interface SingleIngredientResponse {
  ingredient: Omit<Ingredient, 'currentCost'> & { currentCost: number | string }
}

export interface IngredientInput {
  name: string
  unit: string
  currentCost: number
}

function normalizeIngredient(ingredient: SingleIngredientResponse['ingredient']): Ingredient {
  return { ...ingredient, currentCost: Number(ingredient.currentCost) }
}

export const ingredientService = {
  async getAll(getToken: TokenGetter): Promise<Ingredient[]> {
    const response = await fetchApi<IngredientResponse>('/ingredients', getToken)
    return response.ingredients.map(normalizeIngredient)
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