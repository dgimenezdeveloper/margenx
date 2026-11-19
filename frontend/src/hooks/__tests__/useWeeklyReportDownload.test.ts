import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWeeklyReportDownload, WEEKLY_REPORT_UNAVAILABLE_MSG } from '@/hooks/useWeeklyReportDownload'
import { saveBlobAsFile } from '@/lib/downloadFile'
import { ApiError } from '@/services/api'
import { reportService } from '@/services/reportService'

vi.mock('@/services/reportService', () => ({
  reportService: { downloadWeeklyPdf: vi.fn() },
}))
vi.mock('@/lib/downloadFile', () => ({ saveBlobAsFile: vi.fn() }))

const getToken = vi.fn().mockResolvedValue('token-admin')
const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })

describe('useWeeklyReportDownload', () => {
  beforeEach(() => {
    vi.mocked(reportService.downloadWeeklyPdf).mockReset()
    vi.mocked(saveBlobAsFile).mockReset()
  })

  it('guarda el PDF con el nombre que manda la API', async () => {
    vi.mocked(reportService.downloadWeeklyPdf).mockResolvedValue({
      blob: pdf,
      fileName: 'margenx-reporte-2026-11-16.pdf',
    })
    const { result } = renderHook(() => useWeeklyReportDownload(getToken))

    await act(() => result.current.download())

    expect(reportService.downloadWeeklyPdf).toHaveBeenCalledWith(getToken)
    expect(saveBlobAsFile).toHaveBeenCalledWith(pdf, 'margenx-reporte-2026-11-16.pdf')
    expect(result.current.isDownloading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('marca la descarga en curso e ignora un segundo toque', async () => {
    let resolve: (value: { blob: Blob; fileName: string }) => void = () => undefined
    vi.mocked(reportService.downloadWeeklyPdf).mockReturnValue(
      new Promise((res) => {
        resolve = res
      }),
    )
    const { result } = renderHook(() => useWeeklyReportDownload(getToken))

    let first: Promise<void> = Promise.resolve()
    act(() => {
      first = result.current.download()
    })
    expect(result.current.isDownloading).toBe(true)
    await act(() => result.current.download())
    expect(reportService.downloadWeeklyPdf).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolve({ blob: pdf, fileName: 'margenx-reporte-2026-11-16.pdf' })
      await first
    })
    expect(result.current.isDownloading).toBe(false)
  })

  it('con 503 muestra el aviso del generador caído y permite reintentar', async () => {
    vi.mocked(reportService.downloadWeeklyPdf).mockRejectedValueOnce(
      new ApiError('No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.', 503),
    )
    const { result } = renderHook(() => useWeeklyReportDownload(getToken))

    await act(() => result.current.download())

    expect(result.current.error).toBe(WEEKLY_REPORT_UNAVAILABLE_MSG)
    expect(result.current.isDownloading).toBe(false)
    expect(saveBlobAsFile).not.toHaveBeenCalled()

    vi.mocked(reportService.downloadWeeklyPdf).mockResolvedValueOnce({ blob: pdf, fileName: 'margenx-reporte-2026-11-16.pdf' })
    await act(() => result.current.download())
    expect(result.current.error).toBeNull()
    expect(saveBlobAsFile).toHaveBeenCalledTimes(1)
  })

  it('con 401 o 403 muestra el mensaje de la API, como el resto de la app', async () => {
    vi.mocked(reportService.downloadWeeklyPdf).mockRejectedValueOnce(
      new ApiError('No tenés permisos para esta acción.', 403),
    )
    const { result } = renderHook(() => useWeeklyReportDownload(getToken))

    await act(() => result.current.download())

    expect(result.current.error).toBe('No tenés permisos para esta acción.')
  })

  it('sin conexión no muestra el texto técnico del navegador', async () => {
    vi.mocked(reportService.downloadWeeklyPdf).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useWeeklyReportDownload(getToken))

    await act(() => result.current.download())

    expect(result.current.error).toBe('No pudimos descargar el reporte. Revisá tu conexión y probá de nuevo.')
  })
})
