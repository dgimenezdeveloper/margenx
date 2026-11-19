import { useCallback, useRef, useState } from 'react'

import { saveBlobAsFile } from '@/lib/downloadFile'
import { ApiError, type TokenGetter } from '@/services/api'
import { reportService } from '@/services/reportService'

export const WEEKLY_REPORT_UNAVAILABLE_MSG =
  'No pudimos generar el reporte ahora. Probá de nuevo en unos minutos.'
const NETWORK_ERROR_MSG = 'No pudimos descargar el reporte. Revisá tu conexión y probá de nuevo.'

export interface WeeklyReportDownloadState {
  download: () => Promise<void>
  isDownloading: boolean
  error: string | null
}

/** Descarga a pedido del reporte semanal en PDF (`GET /api/reports/weekly.pdf`, solo ADMIN). */
export function useWeeklyReportDownload(getToken: TokenGetter): WeeklyReportDownloadState {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // El estado de React no se actualiza a tiempo si se toca dos veces seguidas.
  const inFlight = useRef(false)

  const download = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setIsDownloading(true)
    setError(null)

    try {
      const { blob, fileName } = await reportService.downloadWeeklyPdf(getToken)
      saveBlobAsFile(blob, fileName)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.status === 503 ? WEEKLY_REPORT_UNAVAILABLE_MSG : err.message)
      } else {
        setError(NETWORK_ERROR_MSG)
      }
    } finally {
      inFlight.current = false
      setIsDownloading(false)
    }
  }, [getToken])

  return { download, isDownloading, error }
}
