'use client'

import { useState } from 'react'
import { AlertTriangle, LoaderCircle, Star, Trash2 } from 'lucide-react'

import { useTokenGetter } from '@/hooks/useTokenGetter'
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPackage, formatPackagePrice } from '@/lib/supplierDisplay'
import { ApiError } from '@/services/api'
import { supplierService, type SupplierPresentation } from '@/services/supplierService'

interface PresentationDeleteDialogProps {
  open: boolean
  supplierId: string
  presentation: SupplierPresentation | null
  onClose: () => void
  onDeleted: (presentation: SupplierPresentation) => void
}

export function PresentationDeleteDialog({
  open,
  supplierId,
  presentation,
  onClose,
  onDeleted,
}: PresentationDeleteDialogProps) {
  const getToken = useTokenGetter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const handleClose = () => {
    setErrorBanner(null)
    onClose()
  }

  const handleDelete = async () => {
    if (!presentation) return
    setIsDeleting(true)
    setErrorBanner(null)

    try {
      await supplierService.removePackaging(getToken, supplierId, presentation.ingredient.id)
      onDeleted(presentation)
      handleClose()
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setErrorBanner(error.message)
      } else {
        setErrorBanner(
          error instanceof ApiError
            ? error.message
            : 'No pudimos quitar la presentación. Revisá tu conexión y volvé a intentar.'
        )
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (!presentation) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isDeleting) handleClose() }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg leading-snug">
                ¿Quitar presentación de {presentation.ingredient.name}?
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {formatPackage(presentation.packageSize, presentation.packageUnit)} · {formatPackagePrice(presentation.packagePrice)}
              </DialogDescription>
            </div>
          </div>

          {presentation.isDefault && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
              <Star className="mt-0.5 size-3.5 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
              <span>
                Esta presentación es la <strong>predeterminada</strong>. Si existen otras presentaciones cargadas para este insumo, deberás seleccionar otra como predeterminada antes de poder quitarla.
              </span>
            </div>
          )}

          {errorBanner && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <p>{errorBanner}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <DialogClose
              disabled={isDeleting}
              className="min-h-11 flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancelar
            </DialogClose>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              {isDeleting ? 'Quitando...' : 'Sí, quitar'}
            </button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}