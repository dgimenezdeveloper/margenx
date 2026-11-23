'use client'

import { Check, LoaderCircle } from 'lucide-react'

import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { formatMoney, formatUnit } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface MakeDefaultDialogProps {
  open: boolean
  ingredientName: string
  supplierName: string
  /** Proveedor de la presentación predeterminada actual, si hay. */
  currentSupplierName?: string | null
  /** Costo por unidad base que pasa a usar el insumo. */
  unitCost: number
  unit: string
  isSaving: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmación antes de cambiar la presentación predeterminada de un insumo (#434). La usan
 * Compras, la ficha del proveedor y la del insumo: cambiarla cambia el costo de las recetas.
 */
export function MakeDefaultDialog({
  open,
  ingredientName,
  supplierName,
  currentSupplierName,
  unitCost,
  unit,
  isSaving,
  onConfirm,
  onCancel,
}: MakeDefaultDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) onCancel()
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
            <Check className="size-7" aria-hidden="true" />
          </div>
          <DialogTitle>¿Cambiar la presentación predeterminada?</DialogTitle>
          <DialogDescription>
            La presentación de <strong>{supplierName}</strong> pasa a ser la predeterminada de <strong>{ingredientName}</strong>
            {currentSupplierName ? ` (reemplaza a ${currentSupplierName})` : ''}. El costo pasa a ser{' '}
            <strong>
              {formatMoney(unitCost)} por {formatUnit(unit)}
            </strong>{' '}
            y se recalculan las recetas que lo usan.
          </DialogDescription>
          <div className="mt-6 flex gap-3">
            <DialogClose
              disabled={isSaving}
              className={cn(
                'min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              Cancelar
            </DialogClose>
            <button
              type="button"
              disabled={isSaving}
              onClick={onConfirm}
              className={cn(
                'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-label="Guardando" /> : 'Confirmar cambio'}
            </button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
