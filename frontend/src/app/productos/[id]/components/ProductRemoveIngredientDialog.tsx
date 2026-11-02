import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'

interface ProductRemoveIngredientDialogProps {
  ingredientName: string | null
  onClose: () => void
  onConfirm: () => void
}

export function ProductRemoveIngredientDialog({
  ingredientName,
  onClose,
  onConfirm,
}: ProductRemoveIngredientDialogProps) {
  return (
    <Dialog open={!!ingredientName} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-7" />
          </div>
          <DialogTitle>¿Quitar insumo de la receta?</DialogTitle>
          <DialogDescription>
            Estás a punto de remover <strong>{ingredientName}</strong> de la preparación.
          </DialogDescription>
          <div className="mt-6 flex gap-3">
            <DialogClose className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer transition">
              Cancelar
            </DialogClose>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-11 flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 cursor-pointer inline-flex items-center justify-center gap-1.5 transition"
            >
              Sí, quitar
            </button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}