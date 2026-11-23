import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'
import { salesSummaryService } from '@/services/salesSummaryService'

const getToken = vi.fn().mockResolvedValue('token-admin-panaderia')

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('salesSummaryService: GET /api/sales/summary (docs/api.md §12)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pide el período indicado con el token', async () => {
    fetchMock.mockResolvedValue(json({ period: 'day', profit: '12500.00' }))

    const summary = await salesSummaryService.get(getToken, 'day')

    expect(summary).toMatchObject({ period: 'day', profit: '12500.00' })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/sales\/summary\?period=day$/)
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-admin-panaderia')
  })

  it('un 403 llega como ApiError', async () => {
    fetchMock.mockResolvedValue(json({ error: 'No tenés permisos para esta acción.' }, 403))
    await expect(salesSummaryService.get(getToken, 'week')).rejects.toBeInstanceOf(ApiError)
  })
})
