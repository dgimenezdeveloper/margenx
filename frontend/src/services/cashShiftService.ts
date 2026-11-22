import { fetchApi, type TokenGetter } from './api'
import type { PaymentMethod } from './saleService'

/** Contrato de `/api/cash-shifts` (docs/api.md §13). Los importes llegan como texto con dos decimales. */
export type CashShiftStatus = 'OPEN' | 'CLOSED'

export interface CashShiftMethod {
  paymentMethod: PaymentMethod
  salesTotal: string
  expected: string
  /** Solo en un turno cerrado. */
  counted: string | null
  difference: string | null
}

export interface CashShift {
  id: string
  status: CashShiftStatus
  openedAt: string
  openedBy: string | null
  closedAt: string | null
  closedBy: string | null
  openingAmount: string
  salesCount: number
  voidedCount: number
  salesTotal: string
  methods: CashShiftMethod[]
  expectedTotal: string
  countedTotal: string | null
  difference: string | null
  /** Solo en `GET /api/cash-shifts/:id`, para imprimir el resumen. */
  businessName?: string
}

export interface CashShiftListResponse {
  data: CashShift[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CloseCashShiftInput {
  countedCash: number
  countedTransfer: number
  countedMercadoPago: number
}

function open(getToken: TokenGetter, openingAmount: number): Promise<CashShift> {
  return fetchApi<CashShift>('/cash-shifts/open', getToken, {
    method: 'POST',
    body: JSON.stringify({ openingAmount }),
  })
}

async function current(getToken: TokenGetter): Promise<CashShift | null> {
  const response = await fetchApi<{ shift: CashShift | null }>('/cash-shifts/current', getToken)
  return response.shift
}

function close(getToken: TokenGetter, id: string, input: CloseCashShiftInput): Promise<CashShift> {
  return fetchApi<CashShift>(`/cash-shifts/${encodeURIComponent(id)}/close`, getToken, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

function list(getToken: TokenGetter, params: { page?: number; limit?: number } = {}): Promise<CashShiftListResponse> {
  const query = new URLSearchParams()
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return fetchApi<CashShiftListResponse>(`/cash-shifts${suffix}`, getToken)
}

function getById(getToken: TokenGetter, id: string): Promise<CashShift> {
  return fetchApi<CashShift>(`/cash-shifts/${encodeURIComponent(id)}`, getToken)
}

export const cashShiftService = { open, current, close, list, getById }
