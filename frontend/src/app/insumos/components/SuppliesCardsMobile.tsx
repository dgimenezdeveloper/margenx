import type { Ingredient } from '@/services/ingredientService'

/**
 * Vista móvil del catálogo de insumos.
 * Convierte la lista en tarjetas táctiles para pantallas pequeñas,
 * manteniendo el mismo contenido y flujo de selección que la versión desktop.
 */
interface SuppliesCardsMobileProps {
  supplies: Ingredient[]
  onSelect: (supply: Ingredient) => void
  money: (value: number) => string
}

/**
 * Renderiza la lista de insumos en tarjetas para dispositivos móviles.
 * Proporciona la misma navegación y contexto visual que la vista desktop, pero optimizada para touch.
 */
export function SuppliesCardsMobile({ supplies, onSelect, money }: SuppliesCardsMobileProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:hidden">
      {supplies.map((supply) => (
        <button
          key={supply.id}
          type="button"
          onClick={() => onSelect(supply)}
          className="group flex w-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex w-full items-start justify-between gap-2">
            <strong className="block text-sm font-bold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">
              {supply.name}
            </strong>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Unidad: {supply.unit}
            </span>
          </div>
          <div className="mt-4 flex w-full items-center justify-between border-t border-gray-50 pt-3 text-xs dark:border-gray-800">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              Tocar para editar o ver proveedores
            </span>
            <strong className="text-sm font-black text-gray-900 dark:text-white">
              {money(supply.currentCost)}
            </strong>
          </div>
        </button>
      ))}
    </div>
  )
}
