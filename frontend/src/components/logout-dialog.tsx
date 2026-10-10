import { LogOut } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface LogoutDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutDialog({ open, onConfirm, onCancel }: LogoutDialogProps) {
  // Bloquea el scroll del fondo cuando el modal está abierto
  useBodyScrollLock(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      {/* Overlay clickeable para cancelar */}
      <div className="fixed inset-0" onClick={onCancel} />

      {/* Tarjeta Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
          <LogOut className="size-7" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          ¿Cerrar sesión?
        </h3>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Estás a punto de salir de MargenX. Para volver a acceder deberás iniciar sesión nuevamente.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Permanecer conectado
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 flex-1 cursor-pointer rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-rose-700"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}