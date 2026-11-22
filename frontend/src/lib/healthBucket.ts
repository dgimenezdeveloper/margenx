import type { Product } from '@/services/productService'

/** Buckets de salud del catálogo, con las mismas claves que GET /api/dashboard/metrics */
export type HealthBucket = 'draft' | 'loss' | 'risk' | 'target' | 'surplus'

/** Productos con receta: los cuatro buckets que dibuja el histograma. */
export type ActiveHealthBucket = Exclude<HealthBucket, 'draft'>

/** Margen a partir del cual un producto en objetivo pasa a superávit (mismo valor que el servidor). */
export const SURPLUS_MARGIN_THRESHOLD = 60

export interface HealthBucketConfig {
  key: HealthBucket
  /**
   * Nombre canónico y unificado en toda la plataforma: Borrador, Pérdida, En riesgo, En objetivo, Superávit.
   * No hay versión corta: en pantallas angostas el rótulo pasa a dos líneas, sin abreviar.
   */
  label: string
  /** Explicación de la condición de negocio */
  description: string
  /** Clases Tailwind para el badge (borde, fondo, texto en claro y oscuro con contraste WCAG AA) */
  badgeClassName: string
  /** Clases de color de texto en claro y oscuro */
  textClassName: string
  /** Clases de borde en claro y oscuro */
  borderClassName: string
  /** Clases de hover de fondo para botones del histograma */
  bgHoverClassName: string
  /** Color para las barras del histograma */
  chartBarClassName: string
  /** Tipo de ícono semántico ('draft' | 'loss' | 'risk' | 'target' | 'surplus') */
  iconType: 'draft' | 'loss' | 'risk' | 'target' | 'surplus'
}

export const HEALTH_BUCKET_META: Record<HealthBucket, HealthBucketConfig> = {
  draft: {
    key: 'draft',
    label: 'Borrador',
    description: 'Producto en borrador sin receta técnica cargada.',
    badgeClassName:
      'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    textClassName: 'text-gray-600 dark:text-gray-400',
    borderClassName: 'border-gray-200 dark:border-gray-700',
    bgHoverClassName: 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
    chartBarClassName: 'bg-gray-400 dark:bg-gray-600',
    iconType: 'draft',
  },
  loss: {
    key: 'loss',
    label: 'Pérdida',
    description: 'Venta a pérdida: el precio de venta no cubre los costos de los insumos.',
    badgeClassName:
      'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/70 dark:text-rose-200',
    textClassName: 'text-rose-700 dark:text-rose-300',
    borderClassName: 'border-rose-200 dark:border-rose-900/60',
    bgHoverClassName: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
    chartBarClassName: 'bg-rose-600 dark:bg-rose-600',
    iconType: 'loss',
  },
  risk: {
    key: 'risk',
    label: 'En riesgo',
    description: 'Rentabilidad positiva pero por debajo del margen mínimo esperado.',
    badgeClassName:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/70 dark:text-rose-300',
    textClassName: 'text-rose-600 dark:text-rose-400',
    borderClassName: 'border-rose-200 dark:border-rose-900/60',
    bgHoverClassName: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
    chartBarClassName: 'bg-rose-400 dark:bg-rose-400',
    iconType: 'risk',
  },
  target: {
    key: 'target',
    label: 'En objetivo',
    description: 'Cumple el margen mínimo objetivo establecido.',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/70 dark:text-emerald-200',
    textClassName: 'text-emerald-700 dark:text-emerald-300',
    borderClassName: 'border-emerald-200 dark:border-emerald-900/60',
    bgHoverClassName: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    chartBarClassName: 'bg-emerald-500 dark:bg-emerald-500',
    iconType: 'target',
  },
  surplus: {
    key: 'surplus',
    label: 'Superávit',
    description: 'Margen superior al 60 % y por encima del mínimo objetivo.',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/70 dark:text-emerald-200',
    textClassName: 'text-emerald-800 dark:text-emerald-200',
    borderClassName: 'border-emerald-200 dark:border-emerald-900/60',
    bgHoverClassName: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    chartBarClassName: 'bg-emerald-600 dark:bg-emerald-400',
    iconType: 'surplus',
  },
}

/**
 * Regla única de los estados de un producto con receta: la usan el panel, la lista y la ficha,
 * para que el mismo producto tenga el mismo estado en todas las pantallas.
 */
function classifyMargin(margin: number, minimum: number): ActiveHealthBucket {
  if (margin < 0) return 'loss'
  if (margin < minimum) return 'risk'
  if (margin <= SURPLUS_MARGIN_THRESHOLD) return 'target'
  return 'surplus'
}

/**
 * Clasifica un producto con la regla de `classifyProductHealthBucket` del backend
 * (docs/especificacion-funcional.md §6).
 */
export function classifyHealthBucket(
  product: Pick<Product, 'ingredients' | 'marginPercent' | 'minMarginPercent'>
): HealthBucket {
  if (!product.ingredients || product.ingredients.length === 0) return 'draft'
  return classifyMargin(product.marginPercent ?? 0, product.minMarginPercent ?? 0)
}

/**
 * Resuelve el bucket de salud para cualquier componente que pase parámetros directos
 * (MarginBadge, ProductStatusBanner, etc.).
 */
export function resolveProductHealthBucket(params: {
  hasRecipe?: boolean
  ingredientsCount?: number
  ingredients?: unknown[]
  marginPercent?: number | null
  minMarginPercent?: number | null
}): HealthBucket {
  const recipeExists =
    params.hasRecipe ??
    (params.ingredientsCount !== undefined
      ? params.ingredientsCount > 0
      : Array.isArray(params.ingredients)
        ? params.ingredients.length > 0
        : true)

  if (!recipeExists) return 'draft'
  return classifyMargin(Number(params.marginPercent ?? 0), Number(params.minMarginPercent ?? 0))
}
