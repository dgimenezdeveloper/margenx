import { ProductSimulatorPanel, type ProductSimulatorPanelProps } from './ProductSimulatorPanel'
import { Dialog, DialogPortal, DialogBackdrop, DialogSheet } from '@/components/ui/dialog'

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

interface ProductMobileSimulatorSheetProps extends Omit<ProductSimulatorPanelProps, 'isMobile' | 'onCancel'> {
  isOpen: boolean
  onClose: () => void
  gain: number
}

export function ProductMobileSimulatorSheet({
  isOpen,
  onClose,
  gain,
  ...simulatorProps
}: ProductMobileSimulatorSheetProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPortal>
        <DialogBackdrop className="lg:hidden" />
        <DialogSheet className="lg:hidden">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Simulador de Precio (Costo: {money(simulatorProps.cost)})
              </p>
            </div>
            <span
              className={`text-sm font-black ${
                !simulatorProps.hasRecipe
                  ? 'text-gray-400'
                  : gain >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              Ganancia: {!simulatorProps.hasRecipe ? '$0' : money(gain)}
            </span>
          </div>
          <div className="mt-5">
            <ProductSimulatorPanel {...simulatorProps} isMobile={true} onCancel={onClose} />
          </div>
        </DialogSheet>
      </DialogPortal>
    </Dialog>
  )
}