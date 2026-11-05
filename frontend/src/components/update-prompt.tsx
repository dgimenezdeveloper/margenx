import { RefreshCw } from 'lucide-react'

interface UpdatePromptProps {
  needRefresh: boolean
  isUpdating?: boolean
  onUpdate: () => void
  onDismiss: () => void
}

// Aviso de versión nueva: no recarga solo, así no se pierde un formulario a medio completar.
export function UpdatePrompt({ needRefresh, isUpdating = false, onUpdate, onDismiss }: UpdatePromptProps) {
  if (!needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-60 mx-auto flex max-w-md flex-col gap-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl md:bottom-6 dark:border-indigo-900 dark:bg-gray-900"
    >
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Hay una versión nueva de MargenX</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Guardá lo que estés editando y tocá Actualizar para cargarla.
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Más tarde
        </button>
        <button
          type="button"
          onClick={onUpdate}
          disabled={isUpdating}
          className="min-h-11 flex-1 cursor-pointer rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUpdating ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  )
}
