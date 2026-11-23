'use client'

import { LoaderCircle, TrendingUp } from 'lucide-react'

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
import type { IngredientMarginImpact } from '@/services/purchasingService'
import { ProductImpactList } from './ProductImpactList'

export type MarginImpactDetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: IngredientMarginImpact }

export interface MarginImpactDialogProps {
  open: boolean
  ingredientName: string
  supplierName: string
  detail: MarginImpactDetailState
  isSaving: boolean
  onConfirm: () => void
  onCancel: () => void
}

function productsSentence(count: number): string {
  return count === 1 ? '1 producto cambia su margen:' : `${count} productos cambian su margen:`
}

/**
 * Confirmación de "Ya le compro a este proveedor" (#446): muestra con
 * GET /api/purchasing/margin-impact/:ingredientId cómo queda el margen de cada producto antes de
 * hacer predeterminada la presentación, así el dueño decide viendo el impacto (RC-16).
 */
export function MarginImpactDialog({
  open,
  ingredientName,
  supplierName,
  detail,
  isSaving,
  onConfirm,
  onCancel,
}: MarginImpactDialogProps) {
  const canConfirm = detail.status === 'ready' && !isSaving

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) onCancel()
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <TrendingUp className="size-7" aria-hidden="true" />
          </div>
          <DialogTitle>¿Ya le comprás a {supplierName}?</DialogTitle>

          {detail.status === 'loading' && (
            <div role="status" className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Calculando cómo queda el margen…
            </div>
          )}

          {detail.status === 'error' && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {detail.message}
            </p>
          )}

          {detail.status === 'ready' && (
            <>
              <DialogDescription>
                {ingredientName} pasa a costar{' '}
                <strong>
                  {formatMoney(detail.data.alternativePresentation.unitCost)} por {formatUnit(detail.data.unit)}
                </strong>{' '}
                y se recalculan sus recetas.{' '}
                {detail.data.products.length > 0
                  ? productsSentence(detail.data.productsAffectedCount)
                  : 'Ningún producto con receta lo usa: cambia solo su costo.'}
              </DialogDescription>
              {detail.data.products.length > 0 && (
                <div className="mt-4 rounded-2xl border border-gray-100 p-3 text-left dark:border-gray-800">
                  <ProductImpactList products={detail.data.products} />
                </div>
              )}
            </>
          )}

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
              disabled={!canConfirm}
              onClick={onConfirm}
              className={cn(
                'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50',
                CANONICAL_FOCUS_CLASSES
              )}
            >
              {isSaving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              Sí, ya le compro
            </button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
