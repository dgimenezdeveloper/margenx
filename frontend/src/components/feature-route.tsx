import { LoaderCircle } from 'lucide-react'

import NotFoundPage from '@/app/not-found/page'
import { useFeatures } from '@/hooks/useFeatures'
import type { Feature } from '@/services/authService'

/**
 * Pantallas de un módulo opcional (ADR-010). Con el módulo apagado se ve la página 404,
 * igual que la API responde 404 en sus rutas.
 */
export function FeatureRoute({ feature, children }: { feature: Feature; children: React.ReactNode }) {
  const { hasFeature, isLoading } = useFeatures()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" aria-label="Cargando" />
      </div>
    )
  }

  if (!hasFeature(feature)) {
    return <NotFoundPage />
  }

  return <>{children}</>
}
