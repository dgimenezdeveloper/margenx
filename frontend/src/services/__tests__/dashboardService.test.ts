import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchApi } from '@/services/api'
import { dashboardService, type DashboardMetrics } from '@/services/dashboardService'

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return { ...actual, fetchApi: vi.fn() }
})

const getToken = vi.fn().mockResolvedValue('token')

describe('dashboardService: contrato de GET /api/dashboard/metrics (docs/api.md)', () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockReset()
  })

  it('pide las métricas del panel y devuelve los cinco buckets de todo el catálogo', async () => {
    const metricas: DashboardMetrics = {
      activeIngredientsCount: 218,
      criticalProductsCount: 119,
      healthyProductsCount: 170,
      averageMarginPercent: 38.5,
      recentCostVariationsCount: 7,
      lossCount: 12,
      riskCount: 107,
      targetCount: 130,
      surplusCount: 40,
      draftCount: 50,
    }
    vi.mocked(fetchApi).mockResolvedValueOnce(metricas)

    await expect(dashboardService.getMetrics(getToken)).resolves.toEqual(metricas)
    expect(fetchApi).toHaveBeenCalledWith('/dashboard/metrics', getToken)
  })
})
