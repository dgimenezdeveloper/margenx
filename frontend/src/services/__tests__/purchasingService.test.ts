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

  it('getMarginImpact consulta GET /purchasing/margin-impact', async () => {
    const mockResponse = {
      summary: { ingredientsWithAlternative: 0, productsAffected: 0, productsLeavingRiskOrLoss: 0 },
      byIngredient: [],
    }
    vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

    const result = await purchasingService.getMarginImpact(getToken)

    expect(fetchApi).toHaveBeenCalledWith('/purchasing/margin-impact', getToken)
    expect(result).toEqual(mockResponse)
  })

  it('getIngredientMarginImpact consulta el detalle del insumo con la presentación codificada en la query', async () => {
    const mockResponse = { ingredientId: 'ing-1', products: [] }
    vi.mocked(fetchApi).mockResolvedValueOnce(mockResponse)

    const result = await purchasingService.getIngredientMarginImpact(getToken, 'ing-1', 'si 2&x')

    expect(fetchApi).toHaveBeenCalledWith(
      '/purchasing/margin-impact/ing-1?supplierIngredientId=si%202%26x',
      getToken
    )
    expect(result).toEqual(mockResponse)
  })
})
