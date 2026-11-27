'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { ChevronRight, LoaderCircle, Package, Plus, Search } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ToastAlert } from '@/components/ToastAlert'
import { Pagination } from '@/components/pagination'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { useToast } from '@/hooks/useToast'
import { ADMIN_ONLY_NOTICE, isAdminOnlyRedirectState } from '@/lib/adminOnlyRedirect'
import { isProductNoticeState } from '@/lib/productNotice'
import { MarginBadge } from '@/components/MarginBadge'
import { useCurrentUser } from '@/lib/useCurrentUser'
import type { PageParams } from '@/services/pagination'
import { productService } from '@/services/productService'
import { formatMoney } from '@/lib/format'

const money = (val: number) => formatMoney(val)

export default function ProductsPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useCurrentUser()
  const isCollaborator = user?.role === 'COLLABORATOR'
  const location = useLocation()
  const navigate = useNavigate()
  const { toast, notify, dismiss: dismissToast } = useToast()

  // Un colaborador que abrió una pantalla del administrador llega acá desde AdminOnlyRoute (#364).
  // El aviso se muestra una vez y se limpia el estado del historial para que recargar no lo repita.
  // Lo mismo con el aviso de crear o eliminar un producto, que llega desde el formulario o la ficha (#432).
  useEffect(() => {
    if (isAdminOnlyRedirectState(location.state)) {
      notify(ADMIN_ONLY_NOTICE.title, 'info', ADMIN_ONLY_NOTICE.description)
    } else if (isProductNoticeState(location.state)) {
      notify(location.state.productNotice.title, location.state.productNotice.type)
    } else {
      return
    }
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.state, location.pathname, location.search, navigate, notify])

  // La API pagina y busca sin tildes ni mayúsculas; los contadores leen meta.total.
  const fetchProducts = useCallback((params: PageParams) => productService.list(getToken, params), [getToken])
  const {
    items: products,
    meta,
    error: loadError,
    isLoading,
    isLoadingMore,
    page,
    limit,
    search: query,
    appliedSearch,
    hasMore,
    setSearch: setQuery,
    goToPage,
    setLimit,
    loadMore,
  } = usePaginatedList(fetchProducts, { errorMessage: 'No se pudieron cargar los productos.' })

  const isTotalEmpty = !isLoading && meta?.total === 0 && !appliedSearch
  const isSearchEmpty = !isLoading && meta?.total === 0 && Boolean(appliedSearch)

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, productId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      router.push(`/productos/${productId}`)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <ToastAlert
          key={toast.id}
          title={toast.title}
          description={toast.description}
          type={toast.type}
          onClose={dismissToast}
        />
      )}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar />

          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Productos</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isCollaborator
                  ? 'Catálogo de precios de venta al público.'
                  : 'Rendimiento y costos de tu catálogo.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:w-72 lg:w-80 shrink-0">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Search className="size-4 text-gray-400" />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  aria-label="Buscar productos por nombre"
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition-colors focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900"
                />
              </div>

              {!isCollaborator && (
                <Link
                  href="/productos/nuevo"
                  className="hidden md:inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
                >
                  <Plus className="size-4" /> Nuevo Producto
                </Link>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Catálogo completo</h2>
              {!isCollaborator && (
                <Link
                  href="/productos/nuevo"
                  className="md:hidden rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  + Nuevo
                </Link>
              )}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 text-sm font-semibold text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <LoaderCircle className="mr-2 size-5 animate-spin" /> Cargando productos...
              </div>
            )}

            {!isLoading && loadError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {loadError}
              </div>
            )}

            {!isLoading && !loadError && isTotalEmpty && (
              <EmptyState
                icon={<Package className="size-6" />}
                // El colaborador solo recibe productos con receta y precio (#428): no le habla de cargarlos.
                title={isCollaborator ? 'Todavía no hay productos a la venta' : 'Aún no tenés productos cargados'}
                description={
                  isCollaborator
                    ? 'Cuando el dueño cargue productos con receta y precio, vas a verlos acá.'
                    : 'Comienza a crear tu catálogo de productos para monitorear sus márgenes y evitar pérdidas.'
                }
                actionLabel={!isCollaborator ? 'Crear mi primer producto' : undefined}
                onAction={!isCollaborator ? () => router.push('/productos/nuevo') : undefined}
              />
            )}

            {!isLoading && !loadError && isSearchEmpty && (
              <EmptyState
                icon={<Search className="size-6" />}
                title="No se encontraron resultados"
                description={`No hay productos que coincidan con la búsqueda "${appliedSearch}".`}
              />
            )}

            {!isLoading && !loadError && !isTotalEmpty && !isSearchEmpty && (
              <>
                {/* VERSIÓN MOBILE */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/productos/${product.id}`}
                      className="group flex w-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <h3 className="text-sm font-bold leading-5 text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">
                          {product.name}
                        </h3>
                        {/* MarginBadge: Renderizado seguro basado en rol y datos */}
                        {!isCollaborator && product.cost !== undefined && (
                          <MarginBadge
                            marginPercent={product.marginPercent}
                            minMarginPercent={product.minMarginPercent}
                            ingredientsCount={product.ingredients.length}
                            size="sm"
                            isCollaborator={isCollaborator}
                          />
                        )}
                      </div>
                      <div className="mt-4 flex w-full items-center justify-between gap-2 border-t border-gray-50 pt-3 text-xs text-gray-500 dark:border-gray-800">
                        {/* Costo: Renderizado seguro basado en rol y datos */}
                        {!isCollaborator && product.cost !== undefined ? (
                          <span>
                            Costo: <strong className="text-gray-700 dark:text-gray-300">{money(product.cost)}</strong>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Atención al público</span>
                        )}
                        <span className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                          Precio: <span className="text-sm">{money(product.salePrice)}</span>
                          <ChevronRight className="size-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* VERSIÓN DESKTOP */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                    <thead className="border-b border-gray-100 bg-gray-50/50 text-gray-900 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-100">
                      <tr>
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Nombre del Producto</th>
                        {!isCollaborator && (
                          <th className="px-5 py-4 font-bold whitespace-nowrap">Costo (Receta)</th>
                        )}
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Precio de Venta</th>
                        {!isCollaborator && (
                          <th className="px-5 py-4 font-bold whitespace-nowrap">Margen</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {products.map((product) => (
                        <tr
                          key={product.id}
                          tabIndex={0}
                          role="button"
                          onClick={() => router.push(`/productos/${product.id}`)}
                          onKeyDown={(event) => handleRowKeyDown(event, product.id)}
                          className="group cursor-pointer transition-colors hover:bg-indigo-50/50 focus-visible:bg-indigo-50/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:bg-indigo-900/20 dark:focus-visible:bg-indigo-950/40"
                        >
                          <td className="px-5 py-4 font-bold text-gray-900 transition-colors group-hover:text-indigo-600 group-focus-visible:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400 dark:group-focus-visible:text-indigo-400">
                            {/* Sin aria-label: el nombre de la fila sale del texto visible (producto, costo, precio y margen), como pide WCAG 2.5.3 (#442). */}
                            <span className="sr-only">Ver detalle del producto </span>
                            {product.name}
                          </td>
                          {!isCollaborator && (
                            <td className="px-5 py-4 font-medium">
                              {product.cost !== undefined ? money(product.cost) : '-'}
                            </td>
                          )}
                          <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100">
                            {money(product.salePrice)}
                          </td>
                          {!isCollaborator && (
                            <td className="px-5 py-4">
                              {product.cost !== undefined && (
                                <MarginBadge
                                  marginPercent={product.marginPercent}
                                  minMarginPercent={product.minMarginPercent}
                                  ingredientsCount={product.ingredients.length}
                                  size="sm"
                                  isCollaborator={isCollaborator}
                                />
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {meta && (
                  <Pagination
                    page={page}
                    totalPages={meta.totalPages}
                    total={meta.total}
                    limit={limit}
                    shown={products.length}
                    itemLabel="productos"
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                    onPageChange={goToPage}
                    onLimitChange={setLimit}
                    onLoadMore={loadMore}
                  />
                )}
              </>
            )}
          </section>
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />
    </main>
  )
}