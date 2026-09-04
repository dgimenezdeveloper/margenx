'use client'

import Link from 'next/link'
import { AlertTriangle, Boxes, ChevronRight, TrendingUp, Plus } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'

const initialProducts = [
  { name: 'Hamburguesa Doble', price: 1600, cost: 1380, margin: 13.8, risk: true },
  { name: 'Combo Familiar', price: 32700, cost: 18000, margin: 45.0, risk: false },
  { name: 'Papas Especiales', price: 6500, cost: 3100, margin: 52.0, risk: false },
  { name: 'Bebida Grande', price: 4000, cost: 2900, margin: 18.0, risk: true }
]

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

export default function DashboardPage() {
  const products = initialProducts
  const riskProductsCount = products.filter((p) => p.risk || p.margin < 30).length
  const avgMargin = (products.reduce((acc, p) => acc + p.margin, 0) / (products.length || 1)).toFixed(1)
  const totalSuppliesCount = 18

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        
        {/* Contenedor del contenido principal */}
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar companyName="Hamburguesería" />

          <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Hola, Administrador</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Aquí tienes el resumen de rentabilidad de tu negocio en tiempo real.
              </p>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/insumos"
                className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                Actualizar Insumos
              </Link>
              <Link
                href="/productos/nuevo"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
              >
                <Plus className="size-4" /> Nuevo Producto
              </Link>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <section className="flex items-center gap-3.5 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-800/80 dark:bg-rose-950/40">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-100">
                  {riskProductsCount} {riskProductsCount === 1 ? 'Producto en Riesgo' : 'Productos en Riesgo'}
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-300">Margen por debajo del 30%</p>
              </div>
            </section>

            <div className="hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:flex md:items-center md:gap-3.5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <Boxes className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400">Insumos Activos</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{totalSuppliesCount} Insumos</p>
              </div>
            </div>

            <div className="hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:flex md:items-center md:gap-3.5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400">Margen Promedio</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{avgMargin}%</p>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight md:text-xl">Catálogo Monitoreado</h2>
              <Link
                href="/productos"
                className="text-right text-xs font-bold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Ver catálogo completo ({products.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {products.map((product) => (
                <Link
                  key={product.name}
                  href="/productos/hamburguesa-doble"
                  className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                      {product.name}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                        product.risk
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-200'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-200'
                      }`}
                    >
                      Margen {product.margin}%
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <span>
                      Costo: <strong className="text-gray-700 dark:text-gray-300">{money(product.cost)}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                      Precio: {money(product.price)}
                      <ChevronRight className="size-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Footer anclado al fondo */}
        <DesktopFooter />
      </div>

      <BottomNav />
    </main>
  )
}