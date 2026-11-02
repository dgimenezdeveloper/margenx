import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'

export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogPortal>
        <DialogBackdrop className="z-60" />
        <DialogPopup className="z-60">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-7" />
          </div>
          <DialogTitle>¿Descartar cambios?</DialogTitle>
          <DialogDescription>
            Los datos ingresados se perderán si abandonas esta pantalla sin guardar.
          </DialogDescription>
          <div className="mt-6 flex gap-3">
            <DialogClose className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Seguir editando
            </DialogClose>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-11 flex-1 cursor-pointer rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-700"
            >
              Descartar
            </button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}