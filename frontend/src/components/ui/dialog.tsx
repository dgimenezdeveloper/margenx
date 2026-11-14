import * as React from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

type DialogRootProps = React.ComponentProps<typeof BaseDialog.Root>
type DialogProps = Omit<DialogRootProps, 'modal'>

/**
 * Raíz de todo diálogo de MargenX (guía en frontend/README.md, sección "Diálogos").
 *
 * Base UI atrapa el foco, cierra con Escape y devuelve el foco al elemento que lo abrió.
 * El scroll del fondo lo bloquea useBodyScrollLock y no Base UI: en iOS Safari el bloqueo
 * por `overflow: hidden` deja moverse el fondo, y ese hook es el que se validó en iPhone.
 */
export function Dialog({ open, defaultOpen = false, onOpenChange, ...props }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isOpen = open ?? uncontrolledOpen

  useBodyScrollLock(isOpen)

  const handleOpenChange: NonNullable<DialogRootProps['onOpenChange']> = (nextOpen, eventDetails) => {
    setUncontrolledOpen(nextOpen)
    onOpenChange?.(nextOpen, eventDetails)
  }

  return (
    <BaseDialog.Root
      {...props}
      modal="trap-focus"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={handleOpenChange}
    />
  )
}

export const DialogTrigger = BaseDialog.Trigger
export const DialogPortal = BaseDialog.Portal
export const DialogClose = BaseDialog.Close

export const DialogBackdrop = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Backdrop
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-all duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0',
        className
      )}
      {...props}
    />
  )
)
DialogBackdrop.displayName = 'DialogBackdrop'

// Para modales centrados (Logout, Delete, etc)
export const DialogPopup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Popup
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900 transition-all duration-200 data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95 outline-none',
        className
      )}
      {...props}
    />
  )
)
DialogPopup.displayName = 'DialogPopup'

// Para bottom-sheets en mobile que se vuelven modales en desktop (Insumos, Historial, etc)
export const DialogSheet = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Popup
      ref={ref}
      className={cn(
        'fixed bottom-0 left-0 z-50 w-full rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 transition-all duration-200 outline-none flex flex-col max-h-[90dvh]',
        'data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:translate-y-full data-starting-style:translate-y-full',
        'md:bottom-auto md:left-1/2 md:top-1/2 md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:data-ending-style:translate-y-[-50%] md:data-starting-style:translate-y-[-50%] md:data-ending-style:scale-95 md:data-starting-style:scale-95',
        className
      )}
      {...props}
    />
  )
)
DialogSheet.displayName = 'DialogSheet'

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Title>>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Title
      ref={ref}
      className={cn('text-lg font-bold text-gray-900 dark:text-gray-100', className)}
      {...props}
    />
  )
)
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Description>>(
  ({ className, ...props }, ref) => (
    <BaseDialog.Description
      ref={ref}
      className={cn('mt-2 text-sm text-gray-500 dark:text-gray-400', className)}
      {...props}
    />
  )
)
DialogDescription.displayName = 'DialogDescription'