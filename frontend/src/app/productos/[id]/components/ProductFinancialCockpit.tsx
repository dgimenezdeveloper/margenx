import { ProductSimulatorPanel, type ProductSimulatorPanelProps } from './ProductSimulatorPanel'

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

interface ProductFinancialCockpitProps extends Omit<ProductSimulatorPanelProps, 'isMobile' | 'onCancel'> {
  gain: number
}

export function ProductFinancialCockpit({ gain, ...simulatorProps }: ProductFinancialCockpitProps) {
  return (
    <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-6">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-800 dark:bg-gray-900 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Simulador Financiero</h3>
            <p className="text-base font-black text-gray-900 dark:text-white mt-1">
              Costo Total: {money(simulatorProps.cost)}
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

        <ProductSimulatorPanel {...simulatorProps} isMobile={false} />
      </div>
    </div>
  )
}