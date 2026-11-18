import { fetchApiFile, type TokenGetter } from './api'

export interface WeeklyReportFile {
  blob: Blob
  fileName: string
}

/** Lee el nombre de `Content-Disposition` y lo reduce a un nombre de archivo, sin rutas. */
export function parseFileNameFromContentDisposition(header: string | null): string | null {
  if (!header) return null

  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header)
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;\s]+))/.exec(header)

  let raw: string | undefined
  if (encoded) {
    try {
      raw = decodeURIComponent(encoded[1].trim())
    } catch {
      raw = undefined
    }
  }
  raw ??= plain?.[1] ?? plain?.[2]

  const name = raw?.split(/[/\\]/).pop()?.trim()
  return name ? name : null
}

/** Mismo formato que la API (`docs/api.md` §11): la fecha es la de Argentina. */
export function weeklyReportFallbackFileName(now: Date = new Date()): string {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return `margenx-reporte-${day}.pdf`
}

export const reportService = {
  /** `GET /api/reports/weekly.pdf` (solo ADMIN). Lanza `ApiError` con el estado HTTP si falla. */
  async downloadWeeklyPdf(getToken: TokenGetter): Promise<WeeklyReportFile> {
    const { blob, headers } = await fetchApiFile('/reports/weekly.pdf', getToken, 'application/pdf')
    const fileName =
      parseFileNameFromContentDisposition(headers.get('Content-Disposition')) ?? weeklyReportFallbackFileName()
    return { blob, fileName }
  },
}
