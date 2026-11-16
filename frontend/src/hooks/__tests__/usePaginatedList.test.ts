import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePaginatedList } from '@/hooks/usePaginatedList'
import { ApiError } from '@/services/api'
import type { PageParams, PageResult } from '@/services/pagination'

interface Insumo {
  id: string
  name: string
}

const TOTAL = 218
const catalogo: Insumo[] = Array.from({ length: TOTAL }, (_, i) => ({ id: `ing-${i}`, name: `Insumo ${i}` }))
catalogo[150] = { id: 'ing-sesamo', name: 'Semillas de sésamo La Molinera' }

/** Simula GET /ingredients: pagina y busca sin tildes, como la API. */
function apiSimulada(params: PageParams): Promise<PageResult<Insumo>> {
  const term = (params.search ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const matches = catalogo.filter((i) =>
    i.name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().includes(term)
  )
  const start = (params.page - 1) * params.limit
  return Promise.resolve({
    items: matches.slice(start, start + params.limit),
    meta: {
      total: matches.length,
      page: params.page,
      limit: params.limit,
      totalPages: matches.length === 0 ? 0 : Math.ceil(matches.length / params.limit),
    },
  })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('usePaginatedList', () => {
  it('carga la primera página de 20 y expone el total real del catálogo', async () => {
    const fetchPage = vi.fn(apiSimulada)
    const { result } = renderHook(() => usePaginatedList(fetchPage))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toHaveLength(20)
    expect(result.current.meta?.total).toBe(TOTAL)
    expect(result.current.catalogTotal).toBe(TOTAL)
    expect(fetchPage).toHaveBeenCalledWith({ page: 1, limit: 20, search: '' })
  })

  it('navega a cualquier página y cambia las filas por página volviendo a la primera', async () => {
    const { result } = renderHook(() => usePaginatedList(apiSimulada))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.goToPage(11))
    await waitFor(() => expect(result.current.page).toBe(11))
    await waitFor(() => expect(result.current.items).toHaveLength(18))

    act(() => result.current.setLimit(100))
    await waitFor(() => expect(result.current.items).toHaveLength(100))
    expect(result.current.page).toBe(1)
    expect(result.current.meta?.totalPages).toBe(3)
  })

  it('"Cargar más" agrega la página siguiente sin perder las anteriores', async () => {
    const { result } = renderHook(() => usePaginatedList(apiSimulada))
    await waitFor(() => expect(result.current.items).toHaveLength(20))

    expect(result.current.hasMore).toBe(true)
    act(() => result.current.loadMore())
    expect(result.current.isLoadingMore).toBe(true)
    await waitFor(() => expect(result.current.items).toHaveLength(40))
    expect(result.current.items[20]?.id).toBe('ing-20')
  })

  it('busca en la API recién 300 ms después de dejar de escribir y conserva el total del catálogo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchPage = vi.fn(apiSimulada)
    const { result } = renderHook(() => usePaginatedList(fetchPage))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.setSearch('ses'))
    act(() => result.current.setSearch('sesamo'))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(fetchPage).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(60)
    })
    await waitFor(() => expect(result.current.items).toEqual([catalogo[150]]))
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: 'sesamo' })
    expect(result.current.meta?.total).toBe(1)
    expect(result.current.catalogTotal).toBe(TOTAL)
  })

  it('muestra el mensaje de la API si la carga falla y permite reintentar', async () => {
    const fetchPage = vi
      .fn<(params: PageParams) => Promise<PageResult<Insumo>>>()
      .mockRejectedValueOnce(new ApiError('Sesión vencida.', 401))
      .mockImplementation(apiSimulada)
    const { result } = renderHook(() => usePaginatedList(fetchPage, { errorMessage: 'No se pudieron cargar.' }))

    await waitFor(() => expect(result.current.error).toBe('Sesión vencida.'))
    expect(result.current.items).toEqual([])

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.items).toHaveLength(20))
    expect(result.current.error).toBeNull()
  })

  it('usa el mensaje genérico ante errores que no son de la API y permite editar la página en memoria', async () => {
    const fetchPage = vi
      .fn<(params: PageParams) => Promise<PageResult<Insumo>>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockImplementation(apiSimulada)
    const { result } = renderHook(() => usePaginatedList(fetchPage, { errorMessage: 'No se pudieron cargar.' }))
    await waitFor(() => expect(result.current.error).toBe('No se pudieron cargar.'))

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.items).toHaveLength(20))
    act(() => result.current.setItems((items) => items.slice(1)))
    expect(result.current.items).toHaveLength(19)
  })

  it('si la página pedida quedó vacía (por ejemplo, tras borrar la última fila) vuelve a la última página con datos', async () => {
    let total = 21
    const fetchPage = vi.fn(async (params: PageParams): Promise<PageResult<Insumo>> => {
      const start = (params.page - 1) * params.limit
      const items = catalogo.slice(0, total).slice(start, start + params.limit)
      return { items, meta: { total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) } }
    })
    const { result } = renderHook(() => usePaginatedList(fetchPage))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.goToPage(2))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    total = 20
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.page).toBe(1))
    await waitFor(() => expect(result.current.items).toHaveLength(20))
  })
})
