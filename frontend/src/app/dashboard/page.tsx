'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/clerk-react'
import { Plus, LoaderCircle } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { ErrorState } from '@/components/error-state'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { productService, type Product } from '@/services/productService'
import { dashboardService, type DashboardMetrics } from '@/services/dashboardService'
import { ApiError } from '@/services/api'

import { DashboardKpiCards } from './components/DashboardKpiCards'
import { HealthDistributionHistogram, type HealthBucketKey } from './components/HealthDistributionHistogram'
import { MonitoredCatalogGrid } from './components/MonitoredCatalogGrid'

export default function DashboardPage() {
  const { getToken } = useAuth()
  const { user, isLoading: isLoadingUser } = useCurrentUser()
  const isCollaborator = user?.role === 'COLLABORATOR'

  const [products, setProducts] = useState<Product[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)

  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState(0)

  const [selectedBucket, setSelectedBucket] = useState<HealthBucketKey | null>(null)

  useEffect(() => {
    // BLOQUEO RBAC: No disparamos ninguna petición hasta saber con certeza el rol del usuario
    if (isLoadingUser) return

    let active = true

    async function fetchData() {
      try {
        if (isCollaborator) {
          const prodRes = await productService.getAll(getToken)
          if (active) {
            setProducts(prodRes ?? [])
            setMetrics(null)
          }
        } else {
          const [metricRes, prodRes] = await Promise.all([
            dashboardService.getMetrics(getToken),
            productService.getAll(getToken),
          ])
          if (active) {
            setMetrics(metricRes ?? null)
            setProducts(prodRes ?? [])
          }
        }
      } catch (err: unknown) {
        if (active) {
          // Solo los errores de la API traen un mensaje pensado para el usuario; un fallo de red
          // (TypeError de fetch) mostraría el texto técnico del navegador en inglés.
          const msg = err instanceof ApiError ? err.message : 'No se pudieron cargar los datos del panel.'
          setLoadError(msg)
          setMetrics(null)
          setProducts([])
        }
      } finally {
        if (active) {
          setIsLoadingMetrics(false)
          setIsLoadingProducts(false)
        }
      }
    }

    void fetchData()

    return () => {
      active = false
    }
  }, [getToken, isCollaborator, isLoadingUser, retryTrigger])

  const handleRetry = () => {
    setLoadError(null)
    setIsLoadingMetrics(true)
    setIsLoadingProducts(true)
    setRetryTrigger((prev) => prev + 1)
  }

  // BLOQUEO RBAC VISUAL: Mostramos un skeleton global mientras se resuelve el rol.
  // Esto garantiza que los componentes financieros NUNCA se monten por error en el DOM.
  if (isLoadingUser) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
          <div className="flex flex-col gap-6 pb-28 md:pb-12">
            <Navbar />
            <div className="flex items-center justify-center py-32">
              <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
        <BottomNav />
      </main>
    )
  }

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

          {loadError ? (
            <ErrorState
              title="Error al cargar el panel"
              description={loadError}
              onRetry={handleRetry}
            />
          ) : (
            <>
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
            </>
          )}
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />
    </main>
  )
}