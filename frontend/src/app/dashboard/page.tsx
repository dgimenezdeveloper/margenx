'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/clerk-react'
import { Plus } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { productService, type Product } from '@/services/productService'
import { dashboardService, type DashboardMetrics } from '@/services/dashboardService'

import { DashboardKpiCards } from './components/DashboardKpiCards'
import { HealthDistributionHistogram, type HealthBucketKey } from './components/HealthDistributionHistogram'
import { MonitoredCatalogGrid } from './components/MonitoredCatalogGrid'

export default function DashboardPage() {
  const { getToken } = useAuth()
  const { user } = useCurrentUser()
  const isCollaborator = user?.role === 'COLLABORATOR'

  const [products, setProducts] = useState<Product[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)

  // Estados de carga independientes para cumplir con el DoD
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true)

  const [selectedBucket, setSelectedBucket] = useState<HealthBucketKey | null>(null)

  useEffect(() => {
    let active = true

    const fetchMetrics = async () => {
      try {
        // Al usar await Promise.resolve(null), garantizamos que la ejecución
        // sea asíncrona y evitamos el error de ESLint (setState síncrono en effect)
        const res = await (isCollaborator
          ? Promise.resolve(null)
          : dashboardService.getMetrics(getToken))

        if (active) {
          if (res) setMetrics(res)
          setIsLoadingMetrics(false)
        }
      } catch {
        if (active) setIsLoadingMetrics(false)
      }
    }

    const fetchProducts = async () => {
      try {
        const res = await productService.getAll(getToken)
        if (active) {
          setProducts(res)
          setIsLoadingProducts(false)
        }
      } catch {
        if (active) setIsLoadingProducts(false)
      }
    }

    void fetchMetrics()
    void fetchProducts()

    return () => {
      active = false
    }
  }, [getToken, isCollaborator])

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar />

          <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Hola, {isCollaborator ? 'Colaborador' : 'Administrador'}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isCollaborator
                  ? 'Consulta los precios de venta al público para atención de salón.'
                  : 'Aquí tienes el resumen de rentabilidad de tu negocio en tiempo real.'}
              </p>
            </div>

            {!isCollaborator && (
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
            )}
          </section>

          {/* Bloques modulares y protegidos por RBAC */}
          {!isCollaborator && (
            <>
              <DashboardKpiCards metrics={metrics} isLoading={isLoadingMetrics} />
              <HealthDistributionHistogram
                products={products}
                isLoading={isLoadingProducts}
                selectedBucket={selectedBucket}
                onSelectBucket={setSelectedBucket}
              />
            </>
          )}

          <MonitoredCatalogGrid
            products={products}
            isLoading={isLoadingProducts}
            isCollaborator={isCollaborator}
            selectedBucket={selectedBucket}
            onClearFilter={() => setSelectedBucket(null)}
          />
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />
    </main>
  )
}