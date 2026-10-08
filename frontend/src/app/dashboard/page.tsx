'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/clerk-react'
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  TrendingUp,
  Plus,
  LoaderCircle,
  BarChart3,
  FilterX,
} from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { MarginBadge } from '@/components/MarginBadge'
import { productService, type Product } from '@/services/productService'
import { ingredientService } from '@/services/ingredientService'

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

type HealthBucketKey = 'loss' | 'low' | 'healthy' | 'high'

interface HealthBucket {
  key: HealthBucketKey
  title: string
  shortTitle: string
  rangeLabel: string
  count: number
  percentage: number
  colorClass: string
  bgHoverClass: string
  borderClass: string
  textClass: string
}

export default function DashboardPage() {
  const { getToken } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [totalSuppliesCount, setTotalSuppliesCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [selectedBucket, setSelectedBucket] = useState<HealthBucketKey | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([
      productService.getAll(getToken),
      ingredientService.getAll(getToken),
    ])
      .then(([prods, supplies]) => {
        if (!active) return
        setProducts(prods)
        setTotalSuppliesCount(supplies.length)
      })
      .catch(() => {
        if (!active) return
        setProducts([])
        setTotalSuppliesCount(0)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const riskProductsCount = products.filter(
    (p) => p.ingredients.length > 0 && p.marginPercent < p.minMarginPercent
  ).length

  const avgMargin =
    products.length > 0
      ? (
          products.reduce((acc, p) => acc + (p.ingredients.length > 0 ? p.marginPercent : 0), 0) /
          products.length
        ).toFixed(1)
      : '0.0'

  const activeRecipeProducts = useMemo(() => {
    return products.filter((p) => p.ingredients.length > 0)
  }, [products])

  const draftProductsCount = useMemo(() => {
    return products.filter((p) => p.ingredients.length === 0).length
  }, [products])

  // Cálculo O(1) de los 4 intervalos de salud financiera con etiquetas diferenciadas Mobile/Desktop
  const healthBuckets = useMemo<HealthBucket[]>(() => {
    const total = activeRecipeProducts.length

    let lossCount = 0
    let lowCount = 0
    let healthyCount = 0
    let highCount = 0

    activeRecipeProducts.forEach((p) => {
      const margin = Number(p.marginPercent)
      const target = Number(p.minMarginPercent)

      if (margin < 0) {
        lossCount += 1
      } else if (margin < target) {
        lowCount += 1
      } else if (margin <= 60) {
        healthyCount += 1
      } else {
        highCount += 1
      }
    })

    const calcPct = (cnt: number) => (total > 0 ? (cnt / total) * 100 : 0)

    return [
      {
        key: 'loss',
        title: 'Venta a Pérdida',
        shortTitle: 'Pérdida',
        rangeLabel: '< 0%',
        count: lossCount,
        percentage: calcPct(lossCount),
        colorClass: 'bg-rose-600 dark:bg-rose-600',
        bgHoverClass: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
        borderClass: 'border-rose-200 dark:border-rose-900/60',
        textClass: 'text-rose-700 dark:text-rose-300',
      },
      {
        key: 'low',
        title: 'En Riesgo',
        shortTitle: 'Riesgo',
        rangeLabel: '< Umbral',
        count: lowCount,
        percentage: calcPct(lowCount),
        colorClass: 'bg-rose-400 dark:bg-rose-400',
        bgHoverClass: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
        borderClass: 'border-rose-200 dark:border-rose-900/60',
        textClass: 'text-rose-600 dark:text-rose-400',
      },
      {
        key: 'healthy',
        title: 'En Objetivo',
        shortTitle: 'Objetivo',
        rangeLabel: '30%–60%',
        count: healthyCount,
        percentage: calcPct(healthyCount),
        colorClass: 'bg-emerald-500 dark:bg-emerald-500',
        bgHoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
        borderClass: 'border-emerald-200 dark:border-emerald-900/60',
        textClass: 'text-emerald-700 dark:text-emerald-300',
      },
      {
        key: 'high',
        title: 'Superávit',
        shortTitle: 'Óptimo',
        rangeLabel: '> 60%',
        count: highCount,
        percentage: calcPct(highCount),
        colorClass: 'bg-emerald-600 dark:bg-emerald-400',
        bgHoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
        borderClass: 'border-emerald-200 dark:border-emerald-900/60',
        textClass: 'text-emerald-800 dark:text-emerald-200',
      },
    ]
  }, [activeRecipeProducts])

  const maxBucketCount = useMemo(() => {
    return Math.max(1, ...healthBuckets.map((b) => b.count))
  }, [healthBuckets])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aHasRecipe = a.ingredients.length > 0
      const bHasRecipe = b.ingredients.length > 0

      if (aHasRecipe && !bHasRecipe) return -1
      if (!aHasRecipe && bHasRecipe) return 1

      if (!aHasRecipe && !bHasRecipe) {
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      }

      const marginDiff = Number(a.marginPercent) - Number(b.marginPercent)
      if (marginDiff !== 0) return marginDiff

      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    })
  }, [products])

  const displayedProducts = useMemo(() => {
    if (!selectedBucket) return sortedProducts

    return sortedProducts.filter((p) => {
      if (p.ingredients.length === 0) return false
      const m = Number(p.marginPercent)
      const target = Number(p.minMarginPercent)

      switch (selectedBucket) {
        case 'loss':
          return m < 0
        case 'low':
          return m >= 0 && m < target
        case 'healthy':
          return m >= target && m <= 60
        case 'high':
          return m > 60 && m >= target
        default:
          return true
      }
    })
  }, [sortedProducts, selectedBucket])

  const handleToggleBucket = (key: HealthBucketKey) => {
    setSelectedBucket((current) => (current === key ? null : key))
  }

  const activeBucketMeta = useMemo(() => {
    return healthBuckets.find((b) => b.key === selectedBucket)
  }, [healthBuckets, selectedBucket])

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar />

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

          {/* Tarjetas resumen KPI */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <section className="flex items-center gap-3.5 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-800/80 dark:bg-rose-950/40">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-100">
                  {riskProductsCount} {riskProductsCount === 1 ? 'Producto en Riesgo' : 'Productos en Riesgo'}
                </p>
                <p className="text-xs font-medium text-rose-700 dark:text-rose-300">Margen por debajo del umbral mínimo</p>
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
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400">Margen Promedio</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{avgMargin}%</p>
              </div>
            </div>
          </div>

          {/* HISTOGRAMA DE SALUD FINANCIERA (MOBILE-FIRST 360px & DESKTOP ISOLATION) */}
          <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-gray-900 dark:text-white md:text-lg">
                    Distribución de Salud Financiera
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Volumen del catálogo agrupado por rango de rentabilidad frente al costo.
                </p>
              </div>

              {/* Indicador de filtro activo */}
              {selectedBucket && activeBucketMeta && (
                <button
                  type="button"
                  onClick={() => setSelectedBucket(null)}
                  className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-300"
                >
                  <FilterX className="size-3.5" />
                  Filtrando: {activeBucketMeta.shortTitle} ({activeBucketMeta.count})
                  <span className="text-[10px] underline ml-1">Restablecer</span>
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex h-44 items-center justify-center text-xs font-semibold text-gray-400">
                <LoaderCircle className="mr-2 size-4 animate-spin text-indigo-600" />
                Analizando estructura de costos...
              </div>
            ) : activeRecipeProducts.length === 0 ? (
              <div className="mt-4 flex h-36 items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400 dark:border-gray-800">
                Aún no hay productos con receta activa para clasificar en el histograma.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {/* Cuadrícula de 4 columnas optimizada para 360px */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                  {healthBuckets.map((bucket) => {
                    const isSelected = selectedBucket === bucket.key
                    const hasProducts = bucket.count > 0
                    // Altura proporcional con base mínima del 18% para impacto visual
                    const heightPercent = hasProducts
                      ? Math.max(18, (bucket.count / maxBucketCount) * 100)
                      : 0

                    return (
                      <button
                        key={bucket.key}
                        type="button"
                        onClick={() => handleToggleBucket(bucket.key)}
                        disabled={!hasProducts}
                        className={`group relative flex flex-col justify-end rounded-2xl border p-2 transition-all text-center cursor-pointer select-none sm:p-3.5 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40'
                            : `${bucket.borderClass} ${hasProducts ? bucket.bgHoverClass : 'opacity-40 cursor-not-allowed'} bg-gray-50/50 dark:bg-gray-800/20`
                        }`}
                      >
                        {/* Cifras de cabecera */}
                        <div className="mb-1.5">
                          <span className={`block text-base font-black sm:text-xl ${bucket.textClass}`}>
                            {bucket.count}
                          </span>
                          <span className="block text-[10px] font-semibold text-gray-400 sm:text-xs">
                            {bucket.percentage.toFixed(0)}%
                          </span>
                        </div>

                        {/* Barra vertical de mayor altura */}
                        <div className="flex h-24 w-full items-end justify-center rounded-lg bg-gray-200/50 p-1 dark:bg-gray-800/60 sm:h-28">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-md transition-all duration-300 ${bucket.colorClass} ${
                              isSelected ? 'brightness-110 shadow-sm' : 'group-hover:opacity-90'
                            }`}
                          />
                        </div>

                        {/* Etiquetas descriptivas: Cortas en Mobile / Completas en Desktop */}
                        <div className="mt-2 space-y-0.5">
                          <p className="text-[11px] font-black leading-tight text-gray-900 dark:text-gray-100 sm:text-xs">
                            <span className="sm:hidden">{bucket.shortTitle}</span>
                            <span className="hidden sm:inline">{bucket.title}</span>
                          </p>
                          <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 sm:text-[10px]">
                            {bucket.rangeLabel}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Subbarra informativa */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-[11px] text-gray-400 dark:border-gray-800/80">
                  <span>
                    {draftProductsCount > 0 ? (
                      <>
                        <strong className="text-gray-600 dark:text-gray-300">{draftProductsCount}</strong> en borrador (sin receta)
                      </>
                    ) : (
                      '100% del catálogo costea con receta'
                    )}
                  </span>
                  <span className="hidden sm:inline">
                    Haz clic en una columna para filtrar los productos abajo
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* CATÁLOGO MONITOREADO (CON FILTRADO INTERACTIVO SIN COLISIONES) */}
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold tracking-tight md:text-xl">
                  {selectedBucket && activeBucketMeta ? (
                    <span className="truncate block">
                      Productos: {activeBucketMeta.title}{' '}
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
                {selectedBucket && (
                  <button
                    type="button"
                    onClick={() => setSelectedBucket(null)}
                    className="text-xs font-bold text-rose-600 transition hover:underline dark:text-rose-400"
                  >
                    <span className="sm:hidden">Restablecer</span>
                    <span className="hidden sm:inline">Ver catálogo completo ({products.length})</span>
                  </button>
                )}
                {!selectedBucket && (
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
              <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 text-sm font-semibold text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <LoaderCircle className="mr-2 size-5 animate-spin text-indigo-600" /> Cargando catálogo...
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900">
                No hay productos que coincidan con la categoría de rentabilidad seleccionada.
                {selectedBucket && (
                  <button
                    type="button"
                    onClick={() => setSelectedBucket(null)}
                    className="mt-2 block mx-auto text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Quitar filtro y ver todos
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {displayedProducts.map((product) => {
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
                        <MarginBadge
                          marginPercent={product.marginPercent}
                          minMarginPercent={product.minMarginPercent}
                          hasRecipe={hasRecipe}
                          size="md"
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        <span>
                          Costo: <strong className="text-gray-700 dark:text-gray-300">{money(product.cost)}</strong>
                        </span>
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
          </section>
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />
    </main>
  )
}