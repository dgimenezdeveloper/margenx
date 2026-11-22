import { describe, expect, it } from 'vitest'

import {
  PAYMENT_METHOD_LABELS,
  addToCart,
  argentinaToday,
  buildTicketText,
  cartItemsForApi,
  cartTotalCents,
  formatTicketNumber,
  isSellable,
  removeFromCart,
  whatsappShareUrl,
} from '@/lib/sales'
import type { Sale } from '@/services/saleService'

const medialuna = { id: 'p-medialuna', name: 'Medialuna de manteca', salePrice: 900 }
const cafe = { id: 'p-cafe', name: 'Café con leche', salePrice: 1500.5 }

describe('carrito de la venta', () => {
  it('suma y resta cantidades, y saca el producto al llegar a cero', () => {
    let cart = addToCart({}, medialuna.id)
    cart = addToCart(cart, medialuna.id)
    cart = addToCart(cart, cafe.id)
    expect(cart).toEqual({ 'p-medialuna': 2, 'p-cafe': 1 })

    cart = removeFromCart(cart, cafe.id)
    expect(cart).toEqual({ 'p-medialuna': 2 })
    expect(removeFromCart(cart, 'p-inexistente')).toEqual(cart)
  })

  it('no pasa de 999 unidades por producto (límite de la API)', () => {
    expect(addToCart({ 'p-medialuna': 999 }, medialuna.id)).toEqual({ 'p-medialuna': 999 })
  })

  it('calcula el total en centavos, sin errores de coma flotante', () => {
    // 3 × 1500,50 = 4501,50; con flotantes 0,1 + 0,2 daría 0,30000000000000004.
    expect(cartTotalCents({ 'p-medialuna': 2, 'p-cafe': 3 }, [medialuna, cafe])).toBe(180000 + 450150)
    expect(cartTotalCents({ 'p-borrado': 1 }, [medialuna])).toBe(0)
  })

  it('arma los ítems para POST /api/sales: solo producto y cantidad', () => {
    expect(cartItemsForApi({ 'p-medialuna': 2, 'p-cafe': 1 })).toEqual([
      { productId: 'p-medialuna', quantity: 2 },
      { productId: 'p-cafe', quantity: 1 },
    ])
  })
})

describe('isSellable', () => {
  it('solo se venden productos con receta y precio mayor a cero', () => {
    expect(isSellable({ salePrice: 900, ingredients: [{ ingredientId: 'harina', quantity: 0.05 }] })).toBe(true)
    expect(isSellable({ salePrice: 900, ingredients: [] })).toBe(false)
    expect(isSellable({ salePrice: 0, ingredients: [{ ingredientId: 'harina', quantity: 1 }] })).toBe(false)
  })
})

const venta: Sale = {
  id: '9f1c2a3b-0000-4000-8000-000000000001',
  ticketNumber: 8,
  businessName: 'Panadería Central',
  soldAt: '2026-11-24T12:30:00.000Z',
  paymentMethod: 'CASH',
  total: '3300.00',
  status: 'COMPLETED',
  cashShiftId: '7a1b2c3d-0000-4000-8000-000000000001',
  voidedAt: null,
  voidReason: null,
  items: [
    { productId: 'p-medialuna', productName: 'Medialuna de manteca', quantity: 2, unitPrice: '900.00', lineTotal: '1800.00' },
    { productId: 'p-cafe', productName: 'Café con leche', quantity: 1, unitPrice: '1500.00', lineTotal: '1500.00' },
  ],
}

describe('ticket', () => {
  it('número de ticket con seis cifras', () => {
    expect(formatTicketNumber(8)).toBe('N.º 000008')
    expect(formatTicketNumber(1234567)).toBe('N.º 1234567')
  })

  it('nombres de los medios de pago', () => {
    expect(PAYMENT_METHOD_LABELS).toEqual({ CASH: 'Efectivo', TRANSFER: 'Transferencia', MERCADO_PAGO: 'Mercado Pago' })
  })

  it('el texto para compartir lleva comercio, fecha de Argentina, ítems, total, medio de pago y la leyenda no fiscal', () => {
    const texto = buildTicketText(venta)
    expect(texto.split('\n')).toEqual([
      '*Panadería Central*',
      'Ticket N.º 000008 · 24/11/2026 09:30',
      '',
      '2 × Medialuna de manteca — $1.800,00',
      '1 × Café con leche — $1.500,00',
      '',
      '*Total: $3.300,00*',
      'Pago: Efectivo',
      '',
      'Comprobante no válido como factura',
    ])
  })

  it('una venta anulada lo dice en el texto', () => {
    expect(buildTicketText({ ...venta, status: 'VOIDED', voidReason: 'Cobré dos veces' })).toContain('VENTA ANULADA')
  })

  it('el enlace de WhatsApp codifica el texto', () => {
    expect(whatsappShareUrl('Total: $3.300,00 · Café')).toBe('https://wa.me/?text=Total%3A%20%243.300%2C00%20%C2%B7%20Caf%C3%A9')
  })
})

describe('argentinaToday', () => {
  it('devuelve el día de Argentina aunque en UTC ya sea el día siguiente', () => {
    expect(argentinaToday(new Date('2026-11-25T02:30:00.000Z'))).toBe('2026-11-24')
    expect(argentinaToday(new Date('2026-11-25T03:30:00.000Z'))).toBe('2026-11-25')
  })
})
