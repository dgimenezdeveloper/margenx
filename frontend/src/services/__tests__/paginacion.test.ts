import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchApi } from '@/services/api'
import { ingredientService } from '@/services/ingredientService'
import { productService } from '@/services/productService'
import { supplierService } from '@/services/supplierService'

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return { ...actual, fetchApi: vi.fn() }
})

const getToken = vi.fn().mockResolvedValue('token')

const sesamo = { id: 'ing-sesamo', name: 'Semillas de sésamo La Molinera', unit: 'kg', currentCost: '5400.00' }
const avena = { id: 'ing-avena', name: 'Avena arrollada Quaker', unit: 'kg', currentCost: '2100.50' }

describe('servicios paginados (contratos de GET con page, limit y search)', () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockReset()
  })

  it('ingredientService.list envía page, limit y search codificado y devuelve meta.total', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      data: [sesamo],
      meta: { total: 7, page: 2, limit: 50, totalPages: 1 },
    })

    const result = await ingredientService.list(getToken, { page: 2, limit: 50, search: ' sésamo ' })

    expect(fetchApi).toHaveBeenCalledWith('/ingredients?page=2&limit=50&search=s%C3%A9samo', getToken)
    expect(result.items[0]).toMatchObject({ name: 'Semillas de sésamo La Molinera', currentCost: 5400 })
    expect(result.meta).toEqual({ total: 7, page: 2, limit: 50, totalPages: 1 })
  })

  it('ingredientService.list omite search vacío y completa meta si la API no la envía', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({ data: [avena] })

    const result = await ingredientService.list(getToken, { page: 1, limit: 20, search: '   ' })

    expect(fetchApi).toHaveBeenCalledWith('/ingredients?page=1&limit=20', getToken)
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 })
  })

  it('ingredientService.getAll recorre todas las páginas de a 100 para no perder insumos', async () => {
    const pagina1 = Array.from({ length: 100 }, (_, i) => ({ ...avena, id: `ing-${i}` }))
    const pagina2 = Array.from({ length: 100 }, (_, i) => ({ ...avena, id: `ing-${100 + i}` }))
    const pagina3 = Array.from({ length: 18 }, (_, i) => ({ ...sesamo, id: `ing-${200 + i}` }))
    vi.mocked(fetchApi)
      .mockResolvedValueOnce({ data: pagina1, meta: { total: 218, page: 1, limit: 100, totalPages: 3 } })
      .mockResolvedValueOnce({ data: pagina2, meta: { total: 218, page: 2, limit: 100, totalPages: 3 } })
      .mockResolvedValueOnce({ data: pagina3, meta: { total: 218, page: 3, limit: 100, totalPages: 3 } })

    const all = await ingredientService.getAll(getToken)

    expect(all).toHaveLength(218)
    expect(fetchApi).toHaveBeenNthCalledWith(1, '/ingredients?page=1&limit=100', getToken)
    expect(fetchApi).toHaveBeenNthCalledWith(3, '/ingredients?page=3&limit=100', getToken)
  })

  it('productService.list envía la búsqueda a la API', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      data: [{ id: 'p-1', name: 'Pan de sésamo', salePrice: '3200.00', ingredients: [] }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    })

    const result = await productService.list(getToken, { page: 1, limit: 20, search: 'sesamo' })

    expect(fetchApi).toHaveBeenCalledWith('/products?page=1&limit=20&search=sesamo', getToken)
    expect(result.items[0]).toMatchObject({ name: 'Pan de sésamo', salePrice: 3200 })
    expect(result.meta.total).toBe(1)
  })

  it('productService.getAll recorre todas las páginas', async () => {
    vi.mocked(fetchApi)
      .mockResolvedValueOnce({
        data: [{ id: 'p-1', name: 'Pan lactal', salePrice: '2500', ingredients: [] }],
        meta: { total: 2, page: 1, limit: 100, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'p-2', name: 'Pan de sésamo', salePrice: '3200', ingredients: [] }],
        meta: { total: 2, page: 2, limit: 100, totalPages: 2 },
      })

    const all = await productService.getAll(getToken)

    expect(all.map((p) => p.id)).toEqual(['p-1', 'p-2'])
  })

  it('supplierService.getPage pagina y busca las presentaciones del proveedor', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      supplier: { id: 'sup-centro', name: 'Distribuidora del Centro', ingredients: [] },
      meta: { total: 67, page: 2, limit: 20, totalPages: 4 },
    })

    const result = await supplierService.getPage(getToken, 'sup-centro', { page: 2, limit: 20, search: 'harina' })

    expect(fetchApi).toHaveBeenCalledWith('/suppliers/sup-centro?page=2&limit=20&search=harina', getToken)
    expect(result.supplier.name).toBe('Distribuidora del Centro')
    expect(result.meta.totalPages).toBe(4)
  })
})
