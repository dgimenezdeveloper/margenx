import { fetchApi, type TokenGetter } from './api'

/** Contrato de `GET /api/sales/summary` (docs/api.md §12). Los importes llegan como texto con dos decimales. */
export type SummaryPeriod = 'day' | 'week' | 'month'

export interface SummaryTotals {
  salesCount: number
  salesTotal: string
  costTotal: string
  profit: string
  /** Ganancia / ventas × 100; `null` si no hubo ventas. */
  marginPercent: string | null
}

export interface RankedProduct {
  productId: string | null
  productName: string
  quantity: number
  salesTotal: string
  profit: string
  marginPercent: string | null
}

export interface SalesSummary extends SummaryTotals {
  period: SummaryPeriod
  /** Primer y último día, AAAA-MM-DD en hora de Argentina. */
  from: string
  to: string
  previous: SummaryTotals & { from: string; to: string }
  /** Variación porcentual contra el período anterior; `null` si el anterior fue 0. */
  change: { salesTotal: string | null; profit: string | null }
  topSold: RankedProduct[]
  topProfit: RankedProduct[]
}

function get(getToken: TokenGetter, period: SummaryPeriod): Promise<SalesSummary> {
  return fetchApi<SalesSummary>(`/sales/summary?period=${period}`, getToken)
}

export const salesSummaryService = { get }
