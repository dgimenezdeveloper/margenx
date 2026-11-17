/** Contrato de paginación de los listados de la API (`meta` de GET /ingredients, /products y /suppliers/:id). */
export interface PageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PageParams {
  page: number
  limit: number
  search?: string
}

export interface PageResult<T> {
  items: T[]
  meta: PageMeta
}

/** Tamaños de página que ofrece el selector de filas. La API acepta hasta 100. */
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]
const MAX_PAGE_SIZE = 100

export function buildPageQuery({ page, limit, search }: PageParams): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  const term = search?.trim()
  if (term) params.set('search', term)
  return params.toString()
}

/** Si la API no envía `meta`, se deduce de la página recibida. */
export function resolveMeta(meta: PageMeta | undefined, params: PageParams, received: number): PageMeta {
  if (meta) return meta
  const total = (params.page - 1) * params.limit + received
  return { total, page: params.page, limit: params.limit, totalPages: total === 0 ? 0 : Math.ceil(total / params.limit) }
}

/** Trae todas las páginas de un listado (de a 100) para los usos que necesitan el catálogo completo. */
export async function fetchAllPages<T>(fetchPage: (params: PageParams) => Promise<PageResult<T>>): Promise<T[]> {
  const first = await fetchPage({ page: 1, limit: MAX_PAGE_SIZE })
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.meta.totalPages - 1, 0) }, (_, i) =>
      fetchPage({ page: i + 2, limit: MAX_PAGE_SIZE })
    )
  )
  return [first, ...rest].flatMap((result) => result.items)
}
