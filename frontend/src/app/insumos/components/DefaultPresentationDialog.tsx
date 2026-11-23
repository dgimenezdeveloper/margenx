'use client'

import { AlertTriangle, LoaderCircle } from 'lucide-react'

import { Dialog, DialogBackdrop, DialogClose, DialogDescription, DialogPopup, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { formatMoney, formatUnit } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DefaultPresentationAction, DefaultPresentationConflict } from '@/services/ingredientService'

export interface DefaultPresentationDialogProps {
  /** La presentación predeterminada que contradice el costo nuevo; `null` cierra el diálogo. */
  presentation: DefaultPresentationConflict | null
  /** Costo por unidad que el dueño quiere guardar. */
  newCost: number
  unit: string
  /** La acción que se está guardando, para mostrar el spinner en su botón. */
  savingAction: DefaultPresentationAction | null
  onChoose: (action: DefaultPresentationAction) => void
  onCancel: () => void
}

const OPTION_CLASSES =
  'inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50'

/**
 * El costo manual de un insumo no coincide con el de su presentación predeterminada (#427, ADR-011):
 * el dueño elige si actualiza el precio de esa presentación o deja de usarla como predeterminada.
 * Hasta que elija, no se guarda nada.
 */
export function DefaultPresentationDialog({
  presentation,
  newCost,
  unit,
  savingAction,
  onChoose,
  onCancel,
}: DefaultPresentationDialogProps) {
  const isSaving = savingAction !== null
  const supplierName = presentation?.supplierName ?? ''

  return (
    <Dialog
      open={presentation !== null}
      onOpenChange={(open) => {
        if (!open && !isSaving) onCancel()
      }}
    >
      <DialogPortal>
        {/* Por encima de la ficha del insumo, que también es un diálogo. */}
        <DialogBackdrop className="z-80" />
        {/* Alto máximo con scroll: con el teléfono horizontal (640×360) el diálogo no entra entero. */}
        <DialogPopup className="z-80 max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto text-left">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <AlertTriangle className="size-7" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center">¿Qué hacemos con la presentación predeterminada?</DialogTitle>
          {presentation && (
            <DialogDescription className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="block">
                Este insumo le comprás a <strong>{supplierName}</strong> a{' '}
                <strong>
                  {formatMoney(presentation.unitCost)} por {formatUnit(unit)}
                </strong>
                . ¿Qué querés hacer?
              </span>
              <span className="block">
                Vas a guardar{' '}
                <strong>
                  {formatMoney(newCost)} por {formatUnit(unit)}
                </strong>
                .
              </span>
            </DialogDescription>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onChoose('update-presentation')}
              className={cn(OPTION_CLASSES, 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700', CANONICAL_FOCUS_CLASSES)}
            >
              {savingAction === 'update-presentation' && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              Actualizar el precio de {supplierName}
            </button>
            <p className="-mt-1 text-xs text-gray-600 dark:text-gray-400">
              El precio del bulto pasa a dar el costo nuevo, y {supplierName} sigue siendo la presentación predeterminada.
            </p>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onChoose('clear-default')}
              className={cn(
                OPTION_CLASSES,
                'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              {savingAction === 'clear-default' && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              Dejar de usar {supplierName} como predeterminado
            </button>
            <p className="-mt-1 text-xs text-gray-600 dark:text-gray-400">
              El insumo queda con el costo que cargaste y sin presentación predeterminada hasta que elijas otra.
            </p>
            <DialogClose
              disabled={isSaving}
              className={cn(
                OPTION_CLASSES,
                'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              Cancelar
            </DialogClose>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
