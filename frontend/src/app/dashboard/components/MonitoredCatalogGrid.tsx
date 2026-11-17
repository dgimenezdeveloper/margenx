import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MarginBadge } from '@/components/MarginBadge'
import { Pagination } from '@/components/pagination'
import { DEFAULT_PAGE_SIZE } from '@/services/pagination'
import type { Product } from '@/services/productService'
import { formatMoney } from '@/lib/format'
import { classifyHealthBucket, type ActiveHealthBucket } from '@/lib/healthBucket'

const money = (val: number) => formatMoney(val)

const BUCKET_TITLES: Record<ActiveHealthBucket, string> = {
  loss: 'Venta a Pérdida',
  risk: 'En Riesgo',
  target: 'En Objetivo',
  surplus: 'Superávit',
}

interface MonitoredCatalogGridProps {
  products: Product[]
  isLoading: boolean
  isCollaborator: boolean
  selectedBucket: ActiveHealthBucket | null
  onClearFilter: () => void
}

interface PagingState {
  /** Columna del histograma para la que vale la página; al cambiar de columna se vuelve a la primera. */
  bucket: ActiveHealthBucket | null
  page: number
  limit: number
  /** true después de "Cargar más" (mobile): se muestran las páginas acumuladas. */
  append: boolean
}

/**
 * Grilla de productos monitoreados.
 * Recibe el catálogo completo (todas las páginas de la API) porque `GET /api/products`
 * no filtra por bucket, y lo muestra de a 20 con el paginador compartido.
 * Maneja su propio ordenamiento (alfabético para colaboradores, por margen para admins)
 * y su propio skeleton de carga.
 */
export function MonitoredCatalogGrid({
  products,
  isLoading,
  isCollaborator,
  selectedBucket,
  onClearFilter,
}: MonitoredCatalogGridProps) {

  const sortedProducts = useMemo(() => {
    if (isCollaborator) {
      return [...products].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
    }

    return [...products].sort((a, b) => {
      const aHasRecipe = a.ingredients.length > 0
      const bHasRecipe = b.ingredients.length > 0

      if (aHasRecipe && !bHasRecipe) return -1
      if (!aHasRecipe && bHasRecipe) return 1
      if (!aHasRecipe && !bHasRecipe) return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

      const marginDiff = (a.marginPercent ?? 0) - (b.marginPercent ?? 0)
      if (marginDiff !== 0) return marginDiff

      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    })
  }, [products, isCollaborator])

  const displayedProducts = useMemo(() => {
    if (!selectedBucket || isCollaborator) return sortedProducts

    // Misma regla que el servidor: la grilla muestra los mismos productos que cuenta la columna.
    return sortedProducts.filter((p) => classifyHealthBucket(p) === selectedBucket)
  }, [sortedProducts, selectedBucket, isCollaborator])

  const activeBucket = isCollaborator ? null : selectedBucket
  const [paging, setPaging] = useState<PagingState>({
    bucket: activeBucket,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    append: false,
  })
  const current: PagingState =
    paging.bucket === activeBucket ? paging : { ...paging, bucket: activeBucket, page: 1, append: false }

  const total = displayedProducts.length
  const totalPages = Math.ceil(total / current.limit)
  // Si el catálogo se achicó (por ejemplo, al reintentar), no se queda en una página vacía.
  const page = Math.min(current.page, Math.max(totalPages, 1))
  const pageProducts = current.append
    ? displayedProducts.slice(0, page * current.limit)
    : displayedProducts.slice((page - 1) * current.limit, page * current.limit)

  const goToPage = (next: number) => setPaging({ ...current, page: next, append: false })
  const setLimit = (limit: number) => setPaging({ ...current, page: 1, limit, append: false })
  const loadMore = () => setPaging({ ...current, page: page + 1, append: true })

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight md:text-xl">
            {selectedBucket && !isCollaborator ? (
              <span className="truncate block">
                Productos: {BUCKET_TITLES[selectedBucket]}{' '}
                <span className="text-xs font-semibold text-gray-400">
                  ({displayedProducts.length} de {products.length})
                </span>
              </span>
            ) : (
              <span>Catálogo Monitoreado</span>
            )}
          </h2>
        </div>

        <div className="shrink-0 text-right">
          {selectedBucket && !isCollaborator && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-xs font-bold text-rose-600 transition hover:underline dark:text-rose-400 cursor-pointer"
            >
              <span className="sm:hidden">Restablecer</span>
              <span className="hidden sm:inline">Ver catálogo completo ({products.length})</span>
            </button>
          )}
          {(!selectedBucket || isCollaborator) && (
            <Link
              href="/productos"
              className="text-xs font-bold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <span className="sm:hidden">Ver todos ({products.length})</span>
              <span className="hidden sm:inline">Ver catálogo completo ({products.length})</span>
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          {selectedBucket && !isCollaborator ? (
            <>
              No hay productos que coincidan con la categoría de rentabilidad seleccionada.
              <button
                type="button"
                onClick={onClearFilter}
                className="mt-2 block mx-auto text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
              >
                Quitar filtro y ver todos
              </button>
            </>
          ) : (
            'Aún no tienes productos registrados en el catálogo.'
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {pageProducts.map((product) => {
            const hasRecipe = product.ingredients.length > 0

            return (
              <Link
                key={product.id}
                href={`/productos/${product.id}`}
                className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                    {product.name}
                  </h3>
                  {!isCollaborator && product.cost !== undefined && (
                    <MarginBadge
                      marginPercent={product.marginPercent}
                      minMarginPercent={product.minMarginPercent}
                      hasRecipe={hasRecipe}
                      size="md"
                      isCollaborator={isCollaborator}
                    />
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  {!isCollaborator && product.cost !== undefined ? (
                    <span>
                      Costo: <strong className="text-gray-700 dark:text-gray-300">{money(product.cost)}</strong>
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-400">
                      Atención al público
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                    Precio: {money(product.salePrice)}
                    <ChevronRight className="size-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {!isLoading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={current.limit}
          shown={pageProducts.length}
          itemLabel="productos"
          hasMore={page < totalPages}
          onPageChange={goToPage}
          onLimitChange={setLimit}
          onLoadMore={loadMore}
        />
      )}
    </section>
  )
}