import { AlertTriangle } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

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
  useBodyScrollLock(Boolean(ingredientName))

  if (!ingredientName) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="size-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          ¿Quitar insumo de la receta?
        </h3>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Estás a punto de remover <strong>{ingredientName}</strong> de la preparación.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 cursor-pointer inline-flex items-center justify-center gap-1.5 transition"
          >
            Sí, quitar
          </button>
        </div>
      </div>
    </div>
  )
}