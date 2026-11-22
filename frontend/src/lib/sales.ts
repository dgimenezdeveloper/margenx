import { formatMoney } from '@/lib/format'
import type { PaymentMethod, Sale } from '@/services/saleService'

/** Venta rápida y ticket no fiscal (ADR-010, docs/manual-usuario/09-ventas.md). */

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
}

export const NON_FISCAL_LEGEND = 'Comprobante no válido como factura'
export const MAX_ITEM_QUANTITY = 999
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires'

/** Carrito: cantidad por id de producto. */
export type Cart = Record<string, number>

export interface CartProduct {
  id: string
  name: string
  salePrice: number
}

export function addToCart(cart: Cart, productId: string): Cart {
  const next = Math.min((cart[productId] ?? 0) + 1, MAX_ITEM_QUANTITY)
  return { ...cart, [productId]: next }
}

export function removeFromCart(cart: Cart, productId: string): Cart {
  const current = cart[productId]
  if (!current) return cart
  const rest = { ...cart }
  if (current <= 1) delete rest[productId]
  else rest[productId] = current - 1
  return rest
}

/** Total en centavos enteros: evita los errores de la coma flotante al sumar precios. */
export function cartTotalCents(cart: Cart, products: CartProduct[]): number {
  const priceCents = new Map(products.map((product) => [product.id, Math.round(product.salePrice * 100)]))
  return Object.entries(cart).reduce((sum, [id, quantity]) => sum + (priceCents.get(id) ?? 0) * quantity, 0)
}

export function cartItemsForApi(cart: Cart): Array<{ productId: string; quantity: number }> {
  return Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }))
}

/** Misma regla que la API: se vende un producto con receta y con precio mayor a cero. */
export function isSellable(product: { salePrice: number; ingredients?: unknown[] }): boolean {
  return product.salePrice > 0 && Array.isArray(product.ingredients) && product.ingredients.length > 0
}

export function formatTicketNumber(ticketNumber: number): string {
  return `N.º ${String(ticketNumber).padStart(6, '0')}`
}

/** "24/11/2026 09:30" en hora de Argentina. */
export function formatSaleDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
}

/** Día de hoy en Argentina (AAAA-MM-DD), para el filtro de `GET /api/sales`. */
export function argentinaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ARGENTINA_TIMEZONE }).format(now)
}

/** Texto del ticket para compartir (WhatsApp usa *negrita*). */
/** Firma de MargenX al pie de cada ticket, impreso o compartido. */
export const TICKET_BRAND_SIGNATURE = 'Emitido con MargenX · margenx.tech'

/** Lema de la marca, el mismo de los reportes PDF. */
export const BRAND_TAGLINE = 'Control de rentabilidad en tiempo real'

export function buildTicketText(sale: Sale): string {
  const lines = [
    `*${sale.businessName}*`,
    `Ticket ${formatTicketNumber(sale.ticketNumber)} · ${formatSaleDateTime(sale.soldAt)}`,
  ]
  if (sale.status === 'VOIDED') lines.push('VENTA ANULADA')
  lines.push('')
  for (const item of sale.items) {
    lines.push(`${item.quantity} × ${item.productName} — ${formatMoney(item.lineTotal)}`)
  }
  lines.push('', `*Total: ${formatMoney(sale.total)}*`, `Pago: ${PAYMENT_METHOD_LABELS[sale.paymentMethod]}`, '', NON_FISCAL_LEGEND, TICKET_BRAND_SIGNATURE)
  return lines.join('\n')
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
