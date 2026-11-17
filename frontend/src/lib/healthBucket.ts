import type { Product } from '@/services/productService'

/** Buckets de salud del catálogo, con las mismas claves que `GET /api/dashboard/metrics`. */
export type HealthBucket = 'draft' | 'loss' | 'risk' | 'target' | 'surplus'

/** Productos con receta: los cuatro buckets que dibuja el histograma. */
export type ActiveHealthBucket = Exclude<HealthBucket, 'draft'>

/** Margen a partir del cual un producto en objetivo pasa a superávit (mismo valor que el servidor). */
export const SURPLUS_MARGIN_THRESHOLD = 60

/**
 * Clasifica un producto con la regla de `classifyProductHealthBucket` del backend
 * (`docs/especificacion-funcional.md`, "Métricas del panel y margen promedio"):
 * cada producto se compara con su propio margen mínimo. El panel la usa para filtrar
 * la grilla por columna y así mostrar los mismos productos que cuenta el servidor.
 */
export function classifyHealthBucket(product: Pick<Product, 'ingredients' | 'marginPercent' | 'minMarginPercent'>): HealthBucket {
  if (product.ingredients.length === 0) return 'draft'
  const margin = product.marginPercent ?? 0
  const minimum = product.minMarginPercent ?? 0
  if (margin < 0) return 'loss'
  if (margin < minimum) return 'risk'
  if (margin <= SURPLUS_MARGIN_THRESHOLD) return 'target'
  return 'surplus'
}
