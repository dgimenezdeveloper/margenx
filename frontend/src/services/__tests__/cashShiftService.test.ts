import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'
import { cashShiftService } from '@/services/cashShiftService'

const getToken = vi.fn().mockResolvedValue('token-cajera-panaderia')
const SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000001'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('cashShiftService: contrato de /api/cash-shifts (docs/api.md §13)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('open manda solo el monto inicial', async () => {
    fetchMock.mockResolvedValue(json({ id: SHIFT_ID, status: 'OPEN' }, 201))

    await cashShiftService.open(getToken, 10000)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/cash-shifts\/open$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ openingAmount: 10000 })
  })

  it('current devuelve el turno abierto o null', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(json({ shift: { id: SHIFT_ID } })))
    expect(await cashShiftService.current(getToken)).toEqual({ id: SHIFT_ID })

    fetchMock.mockImplementationOnce(() => Promise.resolve(json({ shift: null })))
    expect(await cashShiftService.current(getToken)).toBeNull()
    expect(fetchMock.mock.calls[1]![0]).toMatch(/\/cash-shifts\/current$/)
  })

  it('close manda lo contado de los tres medios de pago', async () => {
    fetchMock.mockResolvedValue(json({ id: SHIFT_ID, status: 'CLOSED' }))

    await cashShiftService.close(getToken, SHIFT_ID, { countedCash: 34500, countedTransfer: 8400, countedMercadoPago: 0 })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(new RegExp(`/cash-shifts/${SHIFT_ID}/close$`))
    expect(JSON.parse(init.body)).toEqual({ countedCash: 34500, countedTransfer: 8400, countedMercadoPago: 0 })
  })

  it('list pagina y getById pide el resumen; un 409 llega como ApiError con el mensaje de la API', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(json({ data: [], meta: { total: 0, page: 2, limit: 20, totalPages: 0 } })))
    await cashShiftService.list(getToken, { page: 2 })
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/cash-shifts\?page=2$/)

    fetchMock.mockImplementationOnce(() => Promise.resolve(json({ id: SHIFT_ID })))
    await cashShiftService.getById(getToken, SHIFT_ID)
    expect(fetchMock.mock.calls[1]![0]).toMatch(new RegExp(`/cash-shifts/${SHIFT_ID}$`))

    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(json({ error: 'Ya hay un turno de caja abierto. Cerralo antes de abrir otro.' }, 409))
    )
    const error = await cashShiftService.open(getToken, 5000).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Ya hay un turno de caja abierto. Cerralo antes de abrir otro.' })
  })
})
