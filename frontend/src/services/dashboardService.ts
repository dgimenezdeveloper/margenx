import { fetchApi, type TokenGetter } from './api'

export interface DashboardMetrics {
  activeIngredientsCount: number
  criticalProductsCount: number
  healthyProductsCount: number
  /** Mediana del margen de los productos con receta (no un promedio simple). */
  averageMarginPercent: number
  recentCostVariationsCount: number
  /** Buckets de todo el catálogo; suman el total de productos de la cuenta (`docs/api.md`). */
  lossCount: number
  riskCount: number
  targetCount: number
  surplusCount: number
  draftCount: number
}

export const dashboardService = {
  async getMetrics(getToken: TokenGetter): Promise<DashboardMetrics> {
    return fetchApi<DashboardMetrics>('/dashboard/metrics', getToken)
  },
}