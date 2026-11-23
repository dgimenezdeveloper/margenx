import { fetchApi, type TokenGetter } from './api'

/** Contrato de `/api/sales` (docs/api.md §12). Los importes llegan como texto con dos decimales. */
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'MERCADO_PAGO'
export type SaleStatus = 'COMPLETED' | 'VOIDED'

export interface SaleItem {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: string
  lineTotal: string
  /** Solo para ADMIN: el colaborador nunca recibe costos ni márgenes. */
  unitCost?: string
  lineCost?: string
  marginPercent?: string
}

export interface Sale {
  id: string
  ticketNumber: number
  businessName: string
  soldAt: string
  paymentMethod: PaymentMethod
  total: string
  totalCost?: string
  status: SaleStatus
  cashShiftId: string
  voidedAt: string | null
  voidReason: string | null
  items: SaleItem[]
}

export interface SaleListItem {
  id: string
  ticketNumber: number
  soldAt: string
  paymentMethod: PaymentMethod
  total: string
  status: SaleStatus
  cashShiftId: string
  itemsCount: number
}

export interface SaleListResponse {
  data: SaleListItem[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CreateSaleInput {
  paymentMethod: PaymentMethod
  items: Array<{ productId: string; quantity: number }>
}

export interface SaleListParams {
  page?: number
  limit?: number
  /** Día de Argentina, AAAA-MM-DD. */
  date?: string
  cashShiftId?: string
}

function create(getToken: TokenGetter, input: CreateSaleInput): Promise<Sale> {
  return fetchApi<Sale>('/sales', getToken, { method: 'POST', body: JSON.stringify(input) })
}

function list(getToken: TokenGetter, params: SaleListParams = {}): Promise<SaleListResponse> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return fetchApi<SaleListResponse>(`/sales${suffix}`, getToken)
}

function getById(getToken: TokenGetter, id: string): Promise<Sale> {
  return fetchApi<Sale>(`/sales/${encodeURIComponent(id)}`, getToken)
}

function voidSale(getToken: TokenGetter, id: string, reason: string): Promise<Sale> {
  return fetchApi<Sale>(`/sales/${encodeURIComponent(id)}/void`, getToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export const saleService = { create, list, getById, void: voidSale }
