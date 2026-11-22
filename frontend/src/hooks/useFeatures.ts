import { useCurrentUser } from '@/lib/useCurrentUser'
import type { Feature, FeatureFlags } from '@/services/authService'

const NO_FEATURES: FeatureFlags = { sales: false }

/**
 * Módulos prendidos para la cuenta, según `GET /api/auth/me` (ADR-010).
 * Mientras carga, o si la respuesta no trae `features`, todo queda apagado:
 * la API igual responde 404 en las rutas de un módulo apagado.
 */
export function useFeatures() {
  const { user, isLoading } = useCurrentUser()
  const features: FeatureFlags = { ...NO_FEATURES, ...user?.features }

  return {
    features,
    hasFeature: (feature: Feature) => features[feature],
    isLoading,
  }
}
