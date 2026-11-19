import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'
import {
  parseFileNameFromContentDisposition,
  reportService,
  weeklyReportFallbackFileName,
} from '@/services/reportService'

const getToken = vi.fn().mockResolvedValue('token-admin-panaderia')

function pdfResponse(headers: Record<string, string>): Response {
  return new Response(new Blob(['%PDF-1.4 Panadería Central'], { type: 'application/pdf' }), {
    status: 200,
    headers,
  })
}

describe('reportService.downloadWeeklyPdf: contrato de GET /api/reports/weekly.pdf (docs/api.md §11)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pide el PDF con el token de Clerk y usa el nombre que manda la API', async () => {
    fetchMock.mockResolvedValueOnce(
      pdfResponse({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="margenx-reporte-2026-11-16.pdf"',
      }),
    )

    const result = await reportService.downloadWeeklyPdf(getToken)

    expect(result.fileName).toBe('margenx-reporte-2026-11-16.pdf')
    expect(result.blob.size).toBeGreaterThan(0)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/reports\/weekly\.pdf$/)
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer token-admin-panaderia')
    expect(headers.get('Accept')).toBe('application/pdf')
  })

  it('usa margenx-reporte-AAAA-MM-DD.pdf con la fecha de Argentina si la cabecera no se puede leer', async () => {
    vi.useFakeTimers()
    // 02:30 UTC del 17/11 todavía es 16/11 en Buenos Aires.
    vi.setSystemTime(new Date('2026-11-17T02:30:00Z'))
    fetchMock.mockResolvedValueOnce(pdfResponse({ 'Content-Type': 'application/pdf' }))

    const result = await reportService.downloadWeeklyPdf(getToken)

    expect(result.fileName).toBe('margenx-reporte-2026-11-16.pdf')
    vi.useRealTimers()
  })

  it('lanza ApiError con el estado 503 cuando el generador no está disponible', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const error = await reportService.downloadWeeklyPdf(getToken).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(503)
  })

  it('lanza ApiError 403 con el mensaje de la API para un COLLABORATOR', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'No tenés permisos para esta acción.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(reportService.downloadWeeklyPdf(getToken)).rejects.toMatchObject({
      status: 403,
      message: 'No tenés permisos para esta acción.',
    })
  })
})

describe('parseFileNameFromContentDisposition', () => {
  it('lee el nombre entre comillas, sin comillas y en formato RFC 5987', () => {
    expect(parseFileNameFromContentDisposition('attachment; filename="margenx-reporte-2026-11-16.pdf"')).toBe(
      'margenx-reporte-2026-11-16.pdf',
    )
    expect(parseFileNameFromContentDisposition('attachment; filename=margenx-reporte-2026-11-16.pdf')).toBe(
      'margenx-reporte-2026-11-16.pdf',
    )
    expect(
      parseFileNameFromContentDisposition("attachment; filename*=UTF-8''margenx-reporte-2026-11-16.pdf"),
    ).toBe('margenx-reporte-2026-11-16.pdf')
  })

  it('descarta cabeceras ausentes, vacías o con rutas', () => {
    expect(parseFileNameFromContentDisposition(null)).toBeNull()
    expect(parseFileNameFromContentDisposition('attachment')).toBeNull()
    expect(parseFileNameFromContentDisposition('attachment; filename=""')).toBeNull()
    expect(parseFileNameFromContentDisposition('attachment; filename="../../etc/reporte.pdf"')).toBe('reporte.pdf')
  })
})

describe('weeklyReportFallbackFileName', () => {
  it('arma el nombre con el día de Argentina', () => {
    expect(weeklyReportFallbackFileName(new Date('2026-11-18T15:00:00Z'))).toBe('margenx-reporte-2026-11-18.pdf')
  })
})
