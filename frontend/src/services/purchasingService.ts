import { fetchApi, type TokenGetter } from './api'
import type { ActiveHealthBucket } from '@/lib/healthBucket'

/** Presentación tal como la resume `GET /api/purchasing/margin-impact` (docs/api.md §10). */
export interface MarginImpactPresentation {
  supplierIngredientId: string
  supplierName: string
  unitCost: string
}

/** Un producto con receta que usa el insumo: margen hoy y con la alternativa. */
export interface MarginImpactProduct {
  productId: string
  productName: string
  salePrice: string
  minMarginPercent: string
  currentRecipeCost: string
  projectedRecipeCost: string
  currentMarginAmount: string
  projectedMarginAmount: string
  currentMarginPercent: string
  projectedMarginPercent: string
  currentBucket: ActiveHealthBucket
  projectedBucket: ActiveHealthBucket
}

export interface IngredientMarginImpact {
  ingredientId: string
  ingredientName: string
  unit: string
  currentCost: string
  /** `null` si el insumo no tiene presentación predeterminada activa. */
  defaultPresentation: MarginImpactPresentation | null
  alternativePresentation: MarginImpactPresentation
  unitCostDifference: string
  productsAffectedCount: number
  productsLeavingRiskOrLossCount: number
  products: MarginImpactProduct[]
}

export interface MarginImpactResponse {
  summary: {
    ingredientsWithAlternative: number
    productsAffected: number
    productsLeavingRiskOrLoss: number
  }
  byIngredient: IngredientMarginImpact[]
}

export const purchasingService = {
  async getMarginImpact(getToken: TokenGetter): Promise<MarginImpactResponse> {
    return fetchApi<MarginImpactResponse>('/purchasing/margin-impact', getToken)
  },

  /** Impacto de cambiar a una presentación puntual, para la confirmación de "Ya le compro a este proveedor". */
  async getIngredientMarginImpact(
    getToken: TokenGetter,
    ingredientId: string,
    supplierIngredientId: string
  ): Promise<IngredientMarginImpact> {
    return fetchApi<IngredientMarginImpact>(
      `/purchasing/margin-impact/${encodeURIComponent(ingredientId)}?supplierIngredientId=${encodeURIComponent(supplierIngredientId)}`,
      getToken
    )
  },
}
