// frontend/src/app/productos/[id]/components/ProductMobileFooter.tsx
import { LoaderCircle, Pencil, Save } from 'lucide-react'
import { MarginBadge } from '@/components/MarginBadge'

const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

interface ProductMobileFooterProps {
  isCollaborator: boolean
  watchedSalePrice: string | number
  gain: number
  cost: number
  margin: number
  targetMargin: number
  itemsCount: number
  isSaving: boolean
  onOpenSimulator: () => void
}

export function ProductMobileFooter({
  isCollaborator,
  watchedSalePrice,
  gain,
  cost,
  margin,
  targetMargin,
  itemsCount,
  isSaving,
  onOpenSimulator,
}: ProductMobileFooterProps) {
  return (
    <footer className="fixed inset-x-0 bottom-[calc(3rem+max(0.75rem,env(safe-area-inset-bottom)))] md:bottom-0 z-10 border-t border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">
              Precio: <strong className="text-gray-900 dark:text-gray-100">{money(Number(watchedSalePrice) || 0)}</strong>
            </span>
            {!isCollaborator && (
              <span className="text-gray-500 dark:text-gray-400">
                Ganancia:{' '}
                <strong className={gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {money(gain)}
                </strong>
              </span>
            )}
          </div>
          {!isCollaborator && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Costo: <strong className="text-gray-800 dark:text-gray-200">{money(cost)}</strong>
              </span>
              <MarginBadge marginPercent={margin} minMarginPercent={targetMargin} ingredientsCount={itemsCount} size="sm" />
            </div>
          )}
        </div>

        {!isCollaborator && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSimulator}
              className="flex min-h-11 h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <Pencil className="size-3.5" /> Ajustar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex min-h-11 h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Guardar
            </button>
          </div>
        )}
      </div>
    </footer>
  )
}