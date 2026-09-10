'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { ChevronRight, LoaderCircle, Package, Plus, Search } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ApiError } from '@/services/api'
import { productService, type Product } from '@/services/productService'

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

export default function ProductsPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    productService.getAll(getToken)
      .then((items) => { if (active) setProducts(items) })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof ApiError ? error.message : 'No se pudieron cargar los productos.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [getToken])

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  )

  const isTotalEmpty = products.length === 0
  const isSearchEmpty = filtered.length === 0 && !isTotalEmpty

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">

        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar />

          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Productos</h1>
              <p className="mt-1 text-sm text-gray-500">Rendimiento de tu catálogo.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1 md:w-72 lg:w-80">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  disabled={isTotalEmpty}
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-600 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900"
                />
              </div>
              <Link
                href="/productos/nuevo"
                className="hidden md:inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
              >
                <Plus className="size-4" /> Nuevo Producto
              </Link>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Catálogo completo</h2>
              <Link
                href="/productos/nuevo"
                className="md:hidden rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                + Nuevo
              </Link>
            </div>

            {/* MANEJO DE ESTADOS VACÍOS (Gherkin AC #1) */}
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
                icon={<Package className="size-6"/>}
                title="Aún no tienes productos cargados"
                description="Comienza a crear tu catálogo de productos para monitorear sus márgenes y evitar pérdidas."
                actionLabel="Crear mi primer producto"
                onAction={() => router.push('/productos/nuevo')}
              />
            )}

            {!isLoading && !loadError && isSearchEmpty && (
              <EmptyState
                icon={<Search className="size-6" />}
                title="No se encontraron resultados"
                description={`No hay productos que coincidan con la búsqueda "${query}".`}
              />
            )}

            {/* TABLA VS CARDS (Gherkin AC #2) */}
            {!isLoading && !loadError && !isTotalEmpty && !isSearchEmpty && (
              <>
                {/* VERSIÓN MOBILE: Tarjetas (Se oculta en Desktop) */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filtered.map((product) => (
                    <Link
                      key={product.name}
                      href="/productos/hamburguesa-doble"
                      className="group flex w-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <h3 className="text-sm font-bold leading-5 text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">{product.name}</h3>
                        {product.cost === 0 || product.ingredients.length === 0 ? (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Sin Receta</span>
                        ) : (
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${product.marginPercent < product.minMarginPercent ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'}`}>
                            Margen {product.marginPercent}%
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex w-full items-center justify-between gap-2 border-t border-gray-50 pt-3 text-xs text-gray-500 dark:border-gray-800">
                        <span>Costo: <strong className="text-gray-700 dark:text-gray-300">{money(product.cost)}</strong></span>
                        <span className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                          Precio: <span className="text-sm">{money(product.salePrice)}</span>
                          <ChevronRight className="size-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* VERSIÓN DESKTOP: Tabla genérica con overflow (Se oculta en Mobile) */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                    <thead className="border-b border-gray-100 bg-gray-50/50 text-gray-900 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-100">
                      <tr>
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Nombre del Producto</th>
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Costo (Receta)</th>
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Precio de Venta</th>
                        <th className="px-5 py-4 font-bold whitespace-nowrap">Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filtered.map((product) => (
                        <tr
                          key={product.name}
                          onClick={() => router.push('/productos/hamburguesa-doble')}
                          className="group cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
                        >
                          <td className="px-5 py-4 font-bold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                            {product.name}
                          </td>
                          <td className="px-5 py-4 font-medium">{money(product.cost)}</td>
                          <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100">{money(product.salePrice)}</td>
                          <td className="px-5 py-4">
                            {product.cost === 0 || product.ingredients.length === 0 ? (
                              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Sin Receta</span>
                            ) : (
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${product.marginPercent < product.minMarginPercent ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'}`}>
                                {product.marginPercent}%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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