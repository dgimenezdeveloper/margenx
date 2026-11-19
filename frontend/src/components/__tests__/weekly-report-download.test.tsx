import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { WeeklyReportDownload } from '@/components/weekly-report-download'
import { saveBlobAsFile } from '@/lib/downloadFile'
import { ApiError } from '@/services/api'
import { reportService } from '@/services/reportService'

const getToken = vi.fn().mockResolvedValue('token-admin')

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ getToken }) }))
vi.mock('@/services/reportService', () => ({ reportService: { downloadWeeklyPdf: vi.fn() } }))
vi.mock('@/lib/downloadFile', () => ({ saveBlobAsFile: vi.fn() }))

const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })

describe('WeeklyReportDownload', () => {
  beforeEach(() => {
    vi.mocked(reportService.downloadWeeklyPdf).mockReset()
    vi.mocked(saveBlobAsFile).mockReset()
  })

  it('Escenario Descarga: baja margenx-reporte-AAAA-MM-DD.pdf al tocar el botón', async () => {
    vi.mocked(reportService.downloadWeeklyPdf).mockResolvedValue({ blob: pdf, fileName: 'margenx-reporte-2026-11-16.pdf' })
    render(<WeeklyReportDownload />)

    fireEvent.click(screen.getByRole('button', { name: 'Descargar reporte (PDF)' }))

    await waitFor(() => expect(saveBlobAsFile).toHaveBeenCalledWith(pdf, 'margenx-reporte-2026-11-16.pdf'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra "Generando reporte…" y deshabilita el botón mientras espera', async () => {
    let resolve: (value: { blob: Blob; fileName: string }) => void = () => undefined
    vi.mocked(reportService.downloadWeeklyPdf).mockReturnValue(new Promise((res) => { resolve = res }))
    render(<WeeklyReportDownload />)

    fireEvent.click(screen.getByRole('button', { name: 'Descargar reporte (PDF)' }))

    const busy = await screen.findByRole('button', { name: 'Generando reporte…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')

    resolve({ blob: pdf, fileName: 'margenx-reporte-2026-11-16.pdf' })
    expect(await screen.findByRole('button', { name: 'Descargar reporte (PDF)' })).toBeEnabled()
  })

  it('Escenario Generador caído: con 503 avisa y el botón vuelve a estar disponible', async () => {
    vi.mocked(reportService.downloadWeeklyPdf).mockRejectedValue(
      new ApiError('No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.', 503),
    )
    render(<WeeklyReportDownload />)

    fireEvent.click(screen.getByRole('button', { name: 'Descargar reporte (PDF)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos generar el reporte ahora. Probá de nuevo en unos minutos.',
    )
    expect(screen.getByRole('button', { name: 'Descargar reporte (PDF)' })).toBeEnabled()
    expect(saveBlobAsFile).not.toHaveBeenCalled()
  })

  it('en el Perfil se muestra como enlace "Descargar el último reporte"', async () => {
    vi.mocked(reportService.downloadWeeklyPdf).mockResolvedValue({ blob: pdf, fileName: 'margenx-reporte-2026-11-16.pdf' })
    render(<WeeklyReportDownload variant="link" />)

    fireEvent.click(screen.getByRole('button', { name: 'Descargar el último reporte' }))

    await waitFor(() => expect(saveBlobAsFile).toHaveBeenCalledTimes(1))
  })
})
