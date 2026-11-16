import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useIngredientSearch } from '@/hooks/useIngredientSearch'
import { ingredientService } from '@/services/ingredientService'

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { list: vi.fn() },
}))

const getToken = vi.fn().mockResolvedValue('token')
const sesamo = { id: 'ing-sesamo', name: 'Semillas de sésamo La Molinera', unit: 'kg', currentCost: 5400 }

describe('useIngredientSearch (selector de insumos de la receta)', () => {
  beforeEach(() => {
    vi.mocked(ingredientService.list).mockReset()
  })

  it('sin término no consulta la API', () => {
    const { result } = renderHook(() => useIngredientSearch(getToken, '   '))

    expect(result.current).toEqual({ results: null, isSearching: false })
    expect(ingredientService.list).not.toHaveBeenCalled()
  })

  it('busca en la API con el término limpio y devuelve los resultados', async () => {
    vi.mocked(ingredientService.list).mockResolvedValue({
      items: [sesamo],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    })
    const { result } = renderHook(() => useIngredientSearch(getToken, ' sesamo '))

    expect(result.current.isSearching).toBe(true)
    await waitFor(() => expect(result.current.results).toEqual([sesamo]))
    expect(result.current.isSearching).toBe(false)
    expect(ingredientService.list).toHaveBeenCalledWith(getToken, { page: 1, limit: 100, search: 'sesamo' })
  })

  it('si la API falla, devuelve una lista vacía', async () => {
    vi.mocked(ingredientService.list).mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useIngredientSearch(getToken, 'sesamo'))

    await waitFor(() => expect(result.current.results).toEqual([]))
  })
})
