import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export interface ErrorStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  onRetry?: () => void
  retryLabel?: string
  icon?: ReactNode
  isRetrying?: boolean
  className?: string
}

/**
 * Componente reutilizable para estados de error de red o de servidor (5xx).
 * Proporciona un mensaje claro y un botón de reintento accesible (touch target >= 44px),
 * cumpliendo con contraste WCAG AA, soporte Dark Mode y semántica ARIA.
 */
export function ErrorState({
  title = 'No pudimos cargar la información',
  description = 'Ocurrió un problema al consultar el servidor. Verifica tu conexión e intenta nuevamente.',
  actionLabel,
  onAction,
  onRetry,
  retryLabel = 'Reintentar',
  icon,
  isRetrying = false,
  className = '',
}: ErrorStateProps) {
  const handleRetry = onRetry ?? onAction
  const label = actionLabel ?? retryLabel

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50/60 px-6 py-12 text-center dark:border-rose-900/60 dark:bg-rose-950/30 ${className}`}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
        {icon ?? <AlertTriangle className="size-7" />}
      </div>
      <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mb-6 max-w-md text-sm text-gray-600 dark:text-gray-400">{description}</p>
      {handleRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Reintentando...' : label}
        </button>
      )}
    </div>
  )
}
