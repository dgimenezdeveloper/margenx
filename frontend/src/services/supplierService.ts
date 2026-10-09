import { fetchApi, type TokenGetter } from './api'
import type { Ingredient } from './ingredientService'

export interface Supplier {
  id: string
  accountId: string
  name: string
  contactPhone?: string | null
  email?: string | null
  address?: string | null
  isActive: boolean
}

export interface SupplierIngredient {
  id: string
  supplierId: string
  ingredientId: string
  packageSize: number
  packageUnit: string
  packagePrice: number
  isDefault: boolean
}

export interface SupplierPackagingInput {
  ingredientId: string
  packageSize: number
  packageUnit: 'kg' | 'l' | 'u'
  packagePrice: number
  isDefault?: boolean
}

export interface SupplierPackagingResponse {
  supplierIngredient: SupplierIngredient
  unitCost: number | string
  ingredient?: Ingredient
}

export const supplierService = {
  async getAll(getToken: TokenGetter): Promise<Supplier[]> {
    const response = await fetchApi<{ suppliers: Supplier[] }>('/suppliers', getToken)
    return response.suppliers || []
  },

  async create(
    getToken: TokenGetter,
    input: { name: string; contactPhone?: string; email?: string; address?: string }
  ): Promise<Supplier> {
    const response = await fetchApi<{ supplier: Supplier }>('/suppliers', getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return response.supplier
  },

  async addPackaging(
    getToken: TokenGetter,
    supplierId: string,
    input: SupplierPackagingInput
  ): Promise<SupplierPackagingResponse> {
    return fetchApi<SupplierPackagingResponse>(`/suppliers/${supplierId}/ingredients`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}