import { fetchApi, type TokenGetter } from './api'

export interface ProductIngredientInput {
  ingredientId: string
  quantity: number
}

export interface Product {
  id: string
  name: string
  salePrice: number
  minMarginPercent: number
  cost: number
  marginAmount: number
  marginPercent: number
  ingredients: ProductIngredient[]
  updatedAt?: string
}

export interface ProductIngredient {
  ingredientId: string
  quantity: number
}

export interface ProductInput {
  name: string
  salePrice: number
  minMarginPercent: number
  ingredients: ProductIngredientInput[]
}

type RawProduct = Omit<Product, 'salePrice' | 'minMarginPercent' | 'cost' | 'marginAmount' | 'marginPercent' | 'ingredients'> & {
  salePrice: number | string
  minMarginPercent: number | string
  cost: number | string
  marginAmount: number | string
  marginPercent: number | string
  ingredients?: Array<Omit<ProductIngredient, 'quantity'> & { quantity: number | string }>
}

interface ProductResponse {
  data?: RawProduct[]
  products?: RawProduct[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface SingleProductResponse {
  product: RawProduct
}

function normalizeProduct(product: RawProduct): Product {
  return {
    ...product,
    salePrice: Number(product.salePrice),
    minMarginPercent: Number(product.minMarginPercent),
    cost: Number(product.cost),
    marginAmount: Number(product.marginAmount),
    marginPercent: Number(product.marginPercent),
    ingredients: (product.ingredients ?? []).map((ingredient) => ({
      ...ingredient,
      quantity: Number(ingredient.quantity),
    })),
  }
}

export const productService = {
  async getAll(getToken: TokenGetter): Promise<Product[]> {
    const response = await fetchApi<ProductResponse>('/products', getToken)
    const list = response.data ?? response.products ?? []
    return list.map(normalizeProduct)
  },

  async create(getToken: TokenGetter, input: ProductInput): Promise<Product> {
    const response = await fetchApi<SingleProductResponse>('/products', getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return normalizeProduct(response.product)
  },
}