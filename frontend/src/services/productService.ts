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
  ingredient?: {
    id: string
    name: string
    unit: string
    currentCost: number
  }
}

export interface ProductInput {
  name?: string
  salePrice?: number
  minMarginPercent?: number
  ingredients?: ProductIngredientInput[]
}

type RawProduct = Omit<
  Product,
  'salePrice' | 'minMarginPercent' | 'cost' | 'marginAmount' | 'marginPercent' | 'ingredients'
> & {
  salePrice: number | string
  minMarginPercent: number | string
  cost: number | string
  marginAmount: number | string
  marginPercent: number | string
  ingredients?: Array<
    Omit<ProductIngredient, 'quantity' | 'ingredient'> & {
      quantity: number | string
      ingredient?: { id: string; name: string; unit: string; currentCost: number | string }
    }
  >
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
    ingredients: (product.ingredients ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      ingredient: item.ingredient
        ? {
            ...item.ingredient,
            currentCost: Number(item.ingredient.currentCost),
          }
        : undefined,
    })),
  }
}

// 1. Funciones con firmas sobrecargadas válidas a nivel de módulo
async function getAll(getToken: TokenGetter): Promise<Product[]> {
  const response = await fetchApi<ProductResponse>('/products', getToken)
  const list = response.data ?? response.products ?? []
  return list.map(normalizeProduct)
}

async function getById(id: string, getToken: TokenGetter): Promise<Product>
async function getById(getToken: TokenGetter, id: string): Promise<Product>
async function getById(arg1: string | TokenGetter, arg2: string | TokenGetter): Promise<Product> {
  const id = typeof arg1 === 'string' ? arg1 : (arg2 as string)
  const getToken = typeof arg1 === 'function' ? arg1 : (arg2 as TokenGetter)
  const response = await fetchApi<SingleProductResponse>(`/products/${id}`, getToken)
  return normalizeProduct(response.product)
}

async function create(getToken: TokenGetter, input: ProductInput): Promise<Product> {
  const response = await fetchApi<SingleProductResponse>('/products', getToken, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return normalizeProduct(response.product)
}

async function update(id: string, payload: ProductInput, getToken: TokenGetter): Promise<Product>
async function update(getToken: TokenGetter, id: string, payload: ProductInput): Promise<Product>
async function update(
  arg1: string | TokenGetter,
  arg2: ProductInput | string,
  arg3?: TokenGetter | ProductInput,
): Promise<Product> {
  let id: string
  let payload: ProductInput
  let getToken: TokenGetter

  if (typeof arg1 === 'string') {
    id = arg1
    payload = arg2 as ProductInput
    getToken = arg3 as TokenGetter
  } else {
    getToken = arg1 as TokenGetter
    id = arg2 as string
    payload = arg3 as ProductInput
  }

  const response = await fetchApi<SingleProductResponse>(`/products/${id}`, getToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return normalizeProduct(response.product)
}

async function deleteProduct(id: string, getToken: TokenGetter): Promise<void>
async function deleteProduct(getToken: TokenGetter, id: string): Promise<void>
async function deleteProduct(arg1: string | TokenGetter, arg2: string | TokenGetter): Promise<void> {
  const id = typeof arg1 === 'string' ? arg1 : (arg2 as string)
  const getToken = typeof arg1 === 'function' ? arg1 : (arg2 as TokenGetter)
  await fetchApi(`/products/${id}`, getToken, {
    method: 'DELETE',
  })
}

// 2. Exportación consolidada en el objeto productService
export const productService = {
  getAll,
  getById,
  create,
  update,
  delete: deleteProduct,
}