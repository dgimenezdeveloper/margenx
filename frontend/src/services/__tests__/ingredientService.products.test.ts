import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchApi } from '@/services/api'
import { ingredientService } from '@/services/ingredientService'

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return { ...actual, fetchApi: vi.fn() }
})

const getToken = vi.fn().mockResolvedValue('test-token')

describe('ingredientService.getProducts', () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockReset()
  })

  it('consulta /ingredients/:id/products con parámetros por defecto (limit=100)', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          name: 'Pan flauta — 1 kg',
          quantity: '1.000',
          salePrice: '4332.14',
          cost: '749.30',
          marginAmount: '3582.84',
          marginPercent: '82.70',
          minMarginPercent: '55.00',
          marginStatus: 'surplus',
          updatedAt: '2026-10-14T12:00:00.000Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    })

    const result = await ingredientService.getProducts(getToken, 'ing-1')

    expect(fetchApi).toHaveBeenCalledWith('/ingredients/ing-1/products?page=1&limit=100', getToken)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('Pan flauta — 1 kg')
    expect(result.meta.total).toBe(1)
  })

  it('permite especificar página y límite personalizados', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      data: [],
      meta: { total: 27, page: 2, limit: 10, totalPages: 3 },
    })

    await ingredientService.getProducts(getToken, 'ing-1', { page: 2, limit: 10, search: 'pan' })

    expect(fetchApi).toHaveBeenCalledWith('/ingredients/ing-1/products?page=2&limit=10&search=pan', getToken)
  })
})