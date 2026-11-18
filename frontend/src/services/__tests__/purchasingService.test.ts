import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchApi } from '@/services/api'
import { purchasingService } from '@/services/purchasingService'

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return { ...actual, fetchApi: vi.fn() }
})

const getToken = vi.fn().mockResolvedValue('test-token')

describe('purchasingService', () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockReset()
  })

  it('getSuggestions consulta GET /purchasing/suggestions', async () => {
    const mockResponse = {
      summary: {
        withSavingsCount: 1,
        alreadyBestPriceCount: 0,
        singleSupplierCount: 0,
        withoutEligibleSupplierCount: 0,
        withoutActiveDefaultCount: 0,
        quarantinedExcludedCount: 0,
      },
      byIngredient: [],
      bySupplier: [],
      alreadyBestPrice: [],
      singleSupplier: [],
      quarantinedExcluded: [],
    }
    vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

    const result = await purchasingService.getSuggestions(getToken)

    expect(fetchApi).toHaveBeenCalledWith('/purchasing/suggestions', getToken)
    expect(result).toEqual(mockResponse)
  })

  it('previewOrder envía POST /purchasing/order-preview con items y token', async () => {
    const mockResponse = {
      groups: [],
      total: '44000.00',
      totalSavings: '1000.00',
      totalPackages: 2,
      itemsCount: 1,
    }
    vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

    const items = [{ supplierIngredientId: 'si-1', packages: 2 }]
    const result = await purchasingService.previewOrder(getToken, items)

    expect(fetchApi).toHaveBeenCalledWith('/purchasing/order-preview', getToken, {
      method: 'POST',
      body: JSON.stringify({ items }),
    })
    expect(result).toEqual(mockResponse)
  })
})