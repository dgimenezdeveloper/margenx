import { ProductSimulatorPanel, type ProductSimulatorPanelProps } from './ProductSimulatorPanel'

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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-transparent bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in slide-in-from-bottom duration-200">
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
      </div>
    </div>
  )
}