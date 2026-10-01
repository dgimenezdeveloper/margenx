import { AlertTriangle } from 'lucide-react'

/**
 * Diálogo modal de confirmación para descartar cambios no guardados.
 * Se muestra cuando el usuario intenta abandonar un formulario con datos pendientes.
 */
export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="fixed inset-0" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          ¿Descartar cambios?
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Los datos ingresados se perderán si abandonas esta pantalla sin guardar.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 flex-1 cursor-pointer rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-700"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  )
}
