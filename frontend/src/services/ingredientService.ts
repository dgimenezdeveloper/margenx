import { ApiError, fetchApi, type TokenGetter } from './api'
import { buildPageQuery, fetchAllPages, resolveMeta, type PageMeta, type PageParams, type PageResult } from './pagination'
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

export interface BulkUploadRowInput {
  name: string
  unit: 'kg' | 'l' | 'u'
  /** Decimal normalizado ("1234.56"): el backend lo convierte a Prisma.Decimal (ADR-004). */
  cost: string
}

export interface BulkUploadResponse {
  created: number
  skipped: number
  errors: Array<{ row: number; reason: string }>
}

export interface IngredientProductUsage {
  id: string
  name: string
  quantity: number | string
  salePrice: number | string
  cost: number | string
  marginAmount: number | string
  marginPercent: number | string
  minMarginPercent: number | string
  marginStatus: 'loss' | 'risk' | 'target' | 'surplus' | 'draft'
  updatedAt: string
}

export interface IngredientProductsResponse {
  data: IngredientProductUsage[]
  meta: PageMeta
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
  meta?: PageMeta
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

/** Qué hacer con la presentación predeterminada si el costo manual no coincide con el suyo (#427, ADR-011). */
export type DefaultPresentationAction = 'update-presentation' | 'clear-default'

export interface IngredientInput {
  name: string
  unit: string
  currentCost: number
  defaultPresentationAction?: DefaultPresentationAction
}

/** La presentación predeterminada que contradice el costo manual, tal como la devuelve el 409. */
export interface DefaultPresentationConflict {
  id: string
  supplierName: string
  packageSize: number
  packageUnit: string
  packagePrice: number
  unitCost: number
}

/**
 * Si el error es el 409 `DEFAULT_PRESENTATION_MISMATCH` del PUT del insumo, devuelve la presentación
 * predeterminada para preguntarle al dueño qué hacer con ella; si no, `null`.
 */
export function defaultPresentationMismatch(error: unknown): DefaultPresentationConflict | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const body = error.body as
    | { code?: unknown; defaultPresentation?: Record<string, unknown> }
    | undefined
  const presentation = body?.defaultPresentation
  if (body?.code !== 'DEFAULT_PRESENTATION_MISMATCH' || !presentation) return null
  return {
    id: String(presentation.id),
    supplierName: String(presentation.supplierName),
    packageSize: Number(presentation.packageSize),
    packageUnit: String(presentation.packageUnit),
    packagePrice: Number(presentation.packagePrice),
    unitCost: Number(presentation.unitCost),
  }
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

async function list(getToken: TokenGetter, params: PageParams): Promise<PageResult<Ingredient>> {
  const response = await fetchApi<IngredientResponse>(`/ingredients?${buildPageQuery(params)}`, getToken)
  const items = (response.data ?? response.ingredients ?? []).map(normalizeIngredient)
  return { items, meta: resolveMeta(response.meta, params, items.length) }
}

export const ingredientService = {
  /** Una página del catálogo, con búsqueda en la API (sin tildes ni mayúsculas). */
  list,

  /** Catálogo completo: recorre todas las páginas (selector de la receta, detección de duplicados). */
  async getAll(getToken: TokenGetter): Promise<Ingredient[]> {
    return fetchAllPages((params) => list(getToken, params))
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
  },

  async getProducts(
    getToken: TokenGetter,
    id: string,
    params?: PageParams
  ): Promise<IngredientProductsResponse> {
    const query = params ? buildPageQuery(params) : 'page=1&limit=100'
    return fetchApi<IngredientProductsResponse>(`/ingredients/${id}/products?${query}`, getToken)
  },

  async bulkUpload(getToken: TokenGetter, rows: BulkUploadRowInput[]): Promise<BulkUploadResponse> {
    return fetchApi<BulkUploadResponse>('/ingredients/bulk', getToken, {
      method: 'POST',
      body: JSON.stringify(rows),
    })
  },
}