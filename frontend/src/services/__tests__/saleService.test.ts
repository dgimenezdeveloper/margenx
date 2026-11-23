import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'
import { saleService } from '@/services/saleService'

const getToken = vi.fn().mockResolvedValue('token-cajera-panaderia')
const SALE_ID = '9f1c2a3b-0000-4000-8000-000000000001'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('saleService: contrato de /api/sales (docs/api.md §12)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('create manda solo el medio de pago y los ítems, con el token', async () => {
    fetchMock.mockResolvedValue(json({ id: SALE_ID, ticketNumber: 8 }, 201))

    const sale = await saleService.create(getToken, {
      paymentMethod: 'CASH',
      items: [{ productId: 'p-medialuna', quantity: 2 }],
    })

    expect(sale).toMatchObject({ id: SALE_ID, ticketNumber: 8 })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/sales$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ paymentMethod: 'CASH', items: [{ productId: 'p-medialuna', quantity: 2 }] })
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-cajera-panaderia')
  })

  it('create sin turno abierto lanza ApiError 409 con el mensaje de la API', async () => {
    fetchMock.mockResolvedValue(json({ error: 'No hay un turno de caja abierto. Abrí el turno para empezar a cobrar.' }, 409))

    await expect(
      saleService.create(getToken, { paymentMethod: 'CASH', items: [{ productId: 'p-cafe', quantity: 1 }] })
    ).rejects.toEqual(
      // ApiError conserva el cuerpo de la respuesta (#427).
      new ApiError('No hay un turno de caja abierto. Abrí el turno para empezar a cobrar.', 409, {
        error: 'No hay un turno de caja abierto. Abrí el turno para empezar a cobrar.',
      })
    )
  })

  it('list arma la query solo con los filtros presentes', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })))

    await saleService.list(getToken, { date: '2026-11-24', page: 2, cashShiftId: undefined })
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/sales\?date=2026-11-24&page=2$/)

    await saleService.list(getToken)
    expect(fetchMock.mock.calls[1]![0]).toMatch(/\/sales$/)
  })

  it('getById y void usan el id codificado; void manda el motivo', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ id: SALE_ID, status: 'VOIDED' })))

    await saleService.getById(getToken, SALE_ID)
    expect(fetchMock.mock.calls[0]![0]).toMatch(new RegExp(`/sales/${SALE_ID}$`))

    await saleService.void(getToken, SALE_ID, 'Cobré dos veces la misma venta')
    const [url, init] = fetchMock.mock.calls[1]!
    expect(url).toMatch(new RegExp(`/sales/${SALE_ID}/void$`))
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ reason: 'Cobré dos veces la misma venta' })
  })
})
