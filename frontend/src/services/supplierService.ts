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
  isQuarantined?: boolean
  supplier?: {
    id: string
    name: string
  }
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

// Nuevos tipos para Cuarentena
export interface QuarantinedItem {
  id: string
  ingredientId: string
  supplierId: string
  packagePrice: number
  packageSize: number
  isDefault: boolean
  isQuarantined: boolean
  ingredient: { id: string; name: string; currentCost: number }
  supplier: { id: string; name: string }
}

export interface QuarantineReleaseResponse {
  supplierIngredient: SupplierIngredient
  unitCost: number
  affectedProductsCount: number
  affectedProducts: unknown[]
  criticalProducts: unknown[]
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

  // Nuevos métodos de Cuarentena
  async getQuarantine(getToken: TokenGetter): Promise<QuarantinedItem[]> {
    const response = await fetchApi<{ quarantined: QuarantinedItem[] }>('/suppliers/quarantine', getToken)
    return response.quarantined || []
  },

  async releaseQuarantine(getToken: TokenGetter, id: string): Promise<QuarantineReleaseResponse> {
    return fetchApi<QuarantineReleaseResponse>(`/suppliers/quarantine/${id}/release`, getToken, {
      method: 'POST',
    })
  },

  async rejectQuarantine(getToken: TokenGetter, id: string): Promise<void> {
    await fetchApi(`/suppliers/quarantine/${id}/reject`, getToken, {
      method: 'POST',
    })
  }
}