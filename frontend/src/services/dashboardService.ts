import { fetchApi, type TokenGetter } from './api'

export interface DashboardMetrics {
  activeIngredientsCount: number
  criticalProductsCount: number
  healthyProductsCount: number
  averageMarginPercent: number
  recentCostVariationsCount: number
}

export const dashboardService = {
  async getMetrics(getToken: TokenGetter): Promise<DashboardMetrics> {
    return fetchApi<DashboardMetrics>('/dashboard/metrics', getToken)
  },
}