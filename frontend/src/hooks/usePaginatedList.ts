import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '@/services/api'
import { DEFAULT_PAGE_SIZE, type PageMeta, type PageParams, type PageResult } from '@/services/pagination'

/** Espera entre la última tecla y la consulta a la API (issue de paginación del Sprint 6). */
export const SEARCH_DEBOUNCE_MS = 300

interface Query {
  page: number
  limit: number
  search: string
  /** true cuando la página se suma a las anteriores ("Cargar más" en mobile). */
  append: boolean
  nonce: number
}

interface Loaded<T> {
  nonce: number
  items: T[]
  meta: PageMeta | null
  error: string | null
}

interface Options {
  errorMessage?: string
}

/**
 * Listado paginado contra la API: página, filas por página, búsqueda con espera y "Cargar más".
 * Los contadores leen `meta.total`; `catalogTotal` es el total sin búsqueda.
 */
export function usePaginatedList<T>(
  fetchPage: (params: PageParams) => Promise<PageResult<T>>,
  { errorMessage = 'No se pudo cargar el listado.' }: Options = {}
) {
  const fetchRef = useRef(fetchPage)
  useEffect(() => {
    fetchRef.current = fetchPage
  })

  const [search, setSearch] = useState('')
  const [query, setQuery] = useState<Query>({ page: 1, limit: DEFAULT_PAGE_SIZE, search: '', append: false, nonce: 0 })
  const [loaded, setLoaded] = useState<Loaded<T>>({ nonce: -1, items: [], meta: null, error: null })
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null)

  useEffect(() => {
    const term = search.trim()
    const timer = setTimeout(() => {
      setQuery((q) => (q.search === term ? q : { ...q, page: 1, search: term, append: false, nonce: q.nonce + 1 }))
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    const { page, limit, search: term, append, nonce } = query
    fetchRef
      .current({ page, limit, search: term })
      .then((result) => {
        if (!active) return
        setLoaded((prev) => ({
          nonce,
          items: append ? [...prev.items, ...result.items] : result.items,
          meta: result.meta,
          error: null,
        }))
        if (!term) setCatalogTotal(result.meta.total)
      })
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof ApiError ? error.message : errorMessage
        setLoaded((prev) => ({
          nonce,
          items: append ? prev.items : [],
          meta: append ? prev.meta : null,
          error: message,
        }))
      })
    return () => {
      active = false
    }
  }, [query, errorMessage])

  const pending = loaded.nonce !== query.nonce
  const meta = loaded.meta

  const goToPage = useCallback((page: number) => {
    setQuery((q) => ({ ...q, page, append: false, nonce: q.nonce + 1 }))
  }, [])

  const setLimit = useCallback((limit: number) => {
    setQuery((q) => ({ ...q, page: 1, limit, append: false, nonce: q.nonce + 1 }))
  }, [])

  const loadMore = useCallback(() => {
    setQuery((q) => ({ ...q, page: q.page + 1, append: true, nonce: q.nonce + 1 }))
  }, [])

  /** Vuelve a pedir la página actual (o la primera, si se venía sumando con "Cargar más"). */
  const reload = useCallback(() => {
    setQuery((q) => ({ ...q, page: q.append ? 1 : q.page, append: false, nonce: q.nonce + 1 }))
  }, [])

  const setItems = useCallback((update: (items: T[]) => T[]) => {
    setLoaded((prev) => ({ ...prev, items: update(prev.items) }))
  }, [])

  return {
    items: loaded.items,
    meta,
    catalogTotal,
    error: pending ? null : loaded.error,
    isLoading: pending && !query.append,
    isLoadingMore: pending && query.append,
    page: query.page,
    limit: query.limit,
    search,
    /** Término que ya se consultó a la API (sin la espera de 300 ms). */
    appliedSearch: query.search,
    hasMore: meta !== null && query.page < meta.totalPages,
    setSearch,
    goToPage,
    setLimit,
    loadMore,
    reload,
    setItems,
  }
}
