import type { KeyboardEvent } from 'react'
import type { Ingredient } from '@/services/ingredientService'

/**
 * Vista desktop del catálogo de insumos.
 * Muestra la información principal en tabla para pantallas de mayor tamaño,
 * dejando la selección de cada insumo como acción accesible por clic o teclado (Enter/Espacio)
 * para abrir el editor.
 */
interface SuppliesTableDesktopProps {
  supplies: Ingredient[]
  onSelect: (supply: Ingredient) => void
  money: (value: number) => string
}

/**
 * Renderiza la grilla de insumos en formato tabla para pantallas de escritorio.
 * Mantiene el acceso rápido a la información y permite abrir el detalle del item
 * tanto con clic del mouse como mediante navegación con teclado accesible (Enter / Espacio).
 */
export function SuppliesTableDesktop({ supplies, onSelect, money }: SuppliesTableDesktopProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, supply: Ingredient) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(supply)
    }
  }

  return (
    <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
        <thead className="border-b border-gray-100 bg-gray-50/50 text-gray-900 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-100">
          <tr>
            <th className="px-5 py-4 font-bold whitespace-nowrap">Nombre del Insumo</th>
            <th className="px-5 py-4 font-bold whitespace-nowrap">Unidad de Medida</th>
            <th className="px-5 py-4 font-bold whitespace-nowrap">Costo Actual</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {supplies.map((supply) => (
            <tr
              key={supply.id}
              tabIndex={0}
              role="button"
              aria-label={`Ver y editar insumo ${supply.name}`}
              onClick={() => onSelect(supply)}
              onKeyDown={(event) => handleKeyDown(event, supply)}
              className="group cursor-pointer transition-colors hover:bg-indigo-50/50 focus-visible:bg-indigo-50/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600 dark:hover:bg-indigo-900/20 dark:focus-visible:bg-indigo-950/40"
            >
              <td className="px-5 py-4 font-bold text-gray-900 transition-colors group-hover:text-indigo-600 group-focus-visible:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400 dark:group-focus-visible:text-indigo-400">
                {supply.name}
              </td>
              <td className="px-5 py-4">
                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {supply.unit}
                </span>
              </td>
              <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100">
                {money(supply.currentCost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}