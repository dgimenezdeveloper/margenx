import { fetchApi, type TokenGetter } from './api'
import { buildPageQuery, resolveMeta, type PageMeta, type PageParams } from './pagination'
import type { Ingredient } from './ingredientService'
import type { SupplierPayload } from '@/schemas/supplierSchema'

export interface Supplier {
  id: string
  accountId: string
  name: string
  contactPhone?: string | null
  email?: string | null
  address?: string | null
  isActive: boolean
}

/** Proveedor de `GET /api/suppliers`, con sus contadores (`docs/api.md`). */
export interface SupplierSummary extends Supplier {
  ingredientCount: number
  quarantineCount: number
}

/** Presentación de `GET /api/suppliers/:id`; montos y tamaños llegan como texto decimal. */
export interface SupplierPresentation {
  id: string
  supplierCode?: string | null
  rawDescription?: string | null
  packageSize: number | string
  packageUnit: string
  packagePrice: number | string
  isDefault: boolean
  isQuarantined?: boolean
  quarantinedAt?: string | null
  quarantineReason?: string | null
  ingredient: {
    id: string
    name: string
    unit: string
    currentCost?: number | string
  }
}

export interface SupplierDetail extends Supplier {
  ingredients: SupplierPresentation[]
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
  supplierCode?: string | null
  rawDescription?: string | null
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
  supplierCode?: string | null
  rawDescription?: string | null
}

export interface SupplierPackagingResponse {
  supplierIngredient: SupplierIngredient
  unitCost: number | string
  ingredient?: Ingredient
}

/**
 * Precio retenido en cuarentena, tal como lo usa la app: todos los importes son números.
 * La API los envía como texto (ver `QuarantinedItemApi`) y `getQuarantine` los convierte.
 * `variationPercent` es el valor absoluto de la variación; el sentido (aumento o caída)
 * se obtiene comparando `currentPrice` con `proposedPrice`.
 */
export interface QuarantinedItem {
  id: string
  ingredientId: string
  supplierId: string
  packagePrice: number
  packageSize: number
  currentPrice?: number
  proposedPrice?: number
  quarantineReason?: 'VARIACION_MAYOR_50_POR_CIENTO' | 'COSTO_UNITARIO_INSUFICIENTE' | string
  variationPercent?: number
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

/** Importe tal como lo serializa la API: Prisma convierte los `Decimal` en texto ("18406.25"). */
type DecimalText = string

/** Contrato real de `GET /api/suppliers/quarantine` (docs/api.md §7). */
interface QuarantinedItemApi
  extends Omit<QuarantinedItem, 'packagePrice' | 'packageSize' | 'currentPrice' | 'proposedPrice' | 'variationPercent' | 'ingredient'> {
  packagePrice: DecimalText
  packageSize: DecimalText
  currentPrice?: DecimalText
  proposedPrice?: DecimalText
  variationPercent?: DecimalText
  ingredient: { id: string; name: string; currentCost: DecimalText }
}

/** Contrato real de `POST /api/suppliers/quarantine/:id/release` (docs/api.md §7). */
interface QuarantineReleaseResponseApi extends Omit<QuarantineReleaseResponse, 'supplierIngredient' | 'unitCost'> {
  supplierIngredient: Omit<SupplierIngredient, 'packagePrice' | 'packageSize'> & {
    packagePrice: DecimalText
    packageSize: DecimalText
  }
  unitCost: DecimalText
}

const toNumber = (value: DecimalText | number): number => Number(value)
const toOptionalNumber = (value: DecimalText | number | null | undefined): number | undefined =>
  value === undefined || value === null ? undefined : Number(value)

function normalizeQuarantinedItem(item: QuarantinedItemApi): QuarantinedItem {
  return {
    ...item,
    packagePrice: toNumber(item.packagePrice),
    packageSize: toNumber(item.packageSize),
    currentPrice: toOptionalNumber(item.currentPrice),
    proposedPrice: toOptionalNumber(item.proposedPrice),
    variationPercent: toOptionalNumber(item.variationPercent),
    ingredient: { ...item.ingredient, currentCost: toNumber(item.ingredient.currentCost) },
  }
}

function normalizeQuarantineRelease(response: QuarantineReleaseResponseApi): QuarantineReleaseResponse {
  return {
    ...response,
    supplierIngredient: {
      ...response.supplierIngredient,
      packagePrice: toNumber(response.supplierIngredient.packagePrice),
      packageSize: toNumber(response.supplierIngredient.packageSize),
    },
    unitCost: toNumber(response.unitCost),
  }
}

export const supplierService = {
  async getAll(getToken: TokenGetter): Promise<SupplierSummary[]> {
    const response = await fetchApi<{ suppliers: SupplierSummary[] }>('/suppliers', getToken)
    return response.suppliers || []
  },

  async getById(getToken: TokenGetter, id: string): Promise<SupplierDetail> {
    const response = await fetchApi<{ supplier: SupplierDetail }>(`/suppliers/${id}`, getToken)
    return response.supplier
  },

  /** Ficha del proveedor con sus presentaciones paginadas y filtradas en la API. */
  async getPage(
    getToken: TokenGetter,
    id: string,
    params: PageParams
  ): Promise<{ supplier: SupplierDetail; meta: PageMeta }> {
    const response = await fetchApi<{ supplier: SupplierDetail; meta?: PageMeta }>(
      `/suppliers/${id}?${buildPageQuery(params)}`,
      getToken
    )
    const received = response.supplier.ingredients?.length ?? 0
    return { supplier: response.supplier, meta: resolveMeta(response.meta, params, received) }
  },

  async create(
    getToken: TokenGetter,
    input: { name: string } & Partial<Omit<SupplierPayload, 'name'>>
  ): Promise<Supplier> {
    const response = await fetchApi<{ supplier: Supplier }>('/suppliers', getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return response.supplier
  },

  async update(getToken: TokenGetter, id: string, input: Partial<SupplierPayload>): Promise<Supplier> {
    const response = await fetchApi<{ supplier: Supplier }>(`/suppliers/${id}`, getToken, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    return response.supplier
  },

  async remove(getToken: TokenGetter, id: string): Promise<void> {
    await fetchApi(`/suppliers/${id}`, getToken, { method: 'DELETE' })
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

  async removePackaging(
    getToken: TokenGetter,
    supplierId: string,
    ingredientId: string
  ): Promise<void> {
    await fetchApi(`/suppliers/${supplierId}/ingredients/${ingredientId}`, getToken, {
      method: 'DELETE',
    })
  },

  async getQuarantine(getToken: TokenGetter): Promise<QuarantinedItem[]> {
    const response = await fetchApi<{ quarantined?: QuarantinedItemApi[] }>('/suppliers/quarantine', getToken)
    return (response.quarantined ?? []).map(normalizeQuarantinedItem)
  },

  async releaseQuarantine(getToken: TokenGetter, id: string): Promise<QuarantineReleaseResponse> {
    const response = await fetchApi<QuarantineReleaseResponseApi>(`/suppliers/quarantine/${id}/release`, getToken, {
      method: 'POST',
    })
    return normalizeQuarantineRelease(response)
  },

  async rejectQuarantine(getToken: TokenGetter, id: string): Promise<void> {
    await fetchApi(`/suppliers/quarantine/${id}/reject`, getToken, {
      method: 'POST',
    })
  },
}