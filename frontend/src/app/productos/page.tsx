'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'

const initialProducts = [
  { name: 'Hamburguesa Doble', price: 1600, cost: 1380, margin: 13.8, risk: true },
  { name: 'Combo Familiar', price: 32700, cost: 18000, margin: 45.0, risk: false },
  { name: 'Papas Especiales', price: 6500, cost: 3100, margin: 52.0, risk: false },
  { name: 'Bebida Grande', price: 4000, cost: 2900, margin: 18.0, risk: true },
]

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

export default function ProductsPage() {
  const [products] = useState(initialProducts)
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query]
  )

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
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900"
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

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:overflow-visible md:border-0 md:bg-transparent md:shadow-none dark:border-gray-800 dark:bg-gray-900 md:dark:bg-transparent">
              <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-3 lg:grid-cols-3">
                {filtered.map((product) => (
                  <Link
                    key={product.name}
                    href="/productos/hamburguesa-doble"
                    className="group flex w-full flex-col justify-between border-b border-gray-100 bg-white p-4 text-left transition-all hover:bg-gray-50/80 last:border-0 md:rounded-2xl md:border md:p-5 md:shadow-sm md:hover:border-indigo-200 md:hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/40 md:dark:hover:border-indigo-900"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <h3 className="text-sm font-bold leading-5 text-gray-900 md:text-base group-hover:text-indigo-600 dark:text-gray-100">{product.name}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${product.risk ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'}`}>
                        Margen {product.margin}%
                      </span>
                    </div>
                    <div className="mt-2 flex w-full items-center justify-between gap-2 text-xs text-gray-500 md:mt-4 md:border-t md:border-gray-50 md:pt-3 md:dark:border-gray-800">
                      <span>Costo: <strong className="text-gray-700 dark:text-gray-300">{money(product.cost)}</strong></span>
                      <span className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                        Precio: <span className="text-sm md:text-base">{money(product.price)}</span>
                        <ChevronRight className="size-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />
    </main>
  )
}