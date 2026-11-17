import { useEffect, useState } from 'react'

import type { TokenGetter } from '@/services/api'
import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { SEARCH_DEBOUNCE_MS } from './usePaginatedList'

/** Resultados que muestra el selector de la receta por búsqueda (la API acepta hasta 100). */
const RECIPE_SEARCH_LIMIT = 100

interface SearchState {
  term: string
  items: Ingredient[]
}

/**
 * Búsqueda de insumos contra la API para el selector de la receta: sin tildes ni mayúsculas
 * y 300 ms después de la última tecla. Devuelve `null` mientras no hay término.
 */
export function useIngredientSearch(getToken: TokenGetter, query: string) {
  const term = query.trim()
  const [state, setState] = useState<SearchState>({ term: '', items: [] })

  useEffect(() => {
    if (!term) return
    let active = true
    const timer = setTimeout(() => {
      ingredientService
        .list(getToken, { page: 1, limit: RECIPE_SEARCH_LIMIT, search: term })
        .then((result) => {
          if (active) setState({ term, items: result.items })
        })
        .catch(() => {
          if (active) setState({ term, items: [] })
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [getToken, term])

  const isReady = term !== '' && state.term === term
  return {
    results: isReady ? state.items : null,
    isSearching: term !== '' && !isReady,
  }
}
