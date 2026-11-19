import { useAuth } from '@clerk/clerk-react'
import { AlertTriangle, Download, LoaderCircle } from 'lucide-react'

import { useWeeklyReportDownload } from '@/hooks/useWeeklyReportDownload'

interface WeeklyReportDownloadProps {
  /** `button` en el panel; `link` en la sección de alertas del Perfil. */
  variant?: 'button' | 'link'
  className?: string
}

const BUTTON_CLASS =
  'inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 md:w-auto'
const LINK_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-indigo-700 underline-offset-4 transition hover:underline disabled:cursor-wait disabled:opacity-70 dark:text-indigo-300'

/** Descarga a pedido del reporte semanal en PDF. Solo se monta para ADMIN. */
export function WeeklyReportDownload({ variant = 'button', className }: WeeklyReportDownloadProps) {
  const { getToken } = useAuth()
  const { download, isDownloading, error } = useWeeklyReportDownload(getToken)
  const idleLabel = variant === 'link' ? 'Descargar el último reporte' : 'Descargar reporte (PDF)'

  return (
    <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        onClick={() => void download()}
        disabled={isDownloading}
        aria-busy={isDownloading}
        className={variant === 'link' ? LINK_CLASS : BUTTON_CLASS}
      >
        {isDownloading ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4 shrink-0" aria-hidden="true" />
        )}
        {isDownloading ? 'Generando reporte…' : idleLabel}
      </button>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
