import { LogOut } from 'lucide-react'
import { Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'

interface LogoutDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutDialog({ open, onConfirm, onCancel }: LogoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogPortal>
        <DialogBackdrop className="z-70" />
        <DialogPopup className="z-70">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
            <LogOut className="size-7" />
          </div>
          <DialogTitle>¿Cerrar sesión?</DialogTitle>
          <DialogDescription>
            Estás a punto de salir de MargenX. Para volver a acceder deberás iniciar sesión nuevamente.
          </DialogDescription>
          <div className="mt-6 flex gap-3">
            <DialogClose className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Permanecer conectado
            </DialogClose>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-11 flex-1 cursor-pointer rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-rose-700"
            >
              Cerrar sesión
            </button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}