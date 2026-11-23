import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { useId } from 'react'

import { PAGE_SIZE_OPTIONS } from '@/services/pagination'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  /** Filas cargadas en pantalla (en mobile se acumulan con "Cargar más"). */
  shown: number
  /** Sustantivo en plural: "insumos", "productos", "presentaciones". */
  itemLabel: string
  hasMore: boolean
  isLoadingMore?: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onLoadMore: () => void
}

const numberAR = new Intl.NumberFormat('es-AR')

/**
 * Paginador accesible: en escritorio, selector de filas (20, 50, 100) y anterior/siguiente;
 * en mobile, "Cargar más" en lugar del paginador.
 */
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  shown,
  itemLabel,
  hasMore,
  isLoadingMore = false,
  onPageChange,
  onLimitChange,
  onLoadMore,
}: PaginationProps) {
  const selectId = useId()
  if (total === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const buttonClass =
    'inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'

  return (
    <>
      <nav
        aria-label={`Paginación de ${itemLabel}`}
        className="mt-4 hidden flex-wrap items-center justify-between gap-3 text-sm text-gray-600 md:flex dark:text-gray-300"
      >
        <p aria-live="polite">
          Mostrando {numberAR.format(from)}–{numberAR.format(to)} de {numberAR.format(total)} {itemLabel}
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor={selectId} className="font-semibold">
            Filas por página
          </label>
          <select
            id={selectId}
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="h-11 cursor-pointer rounded-xl border border-gray-200 bg-white px-3 font-bold text-gray-900 outline-none transition hover:bg-gray-50 focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[color-scheme:dark] dark:hover:bg-gray-800"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
            className={buttonClass}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-28 text-center font-semibold" aria-current="page">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Página siguiente"
            className={buttonClass}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <div className="mt-4 flex flex-col items-center gap-3 text-sm text-gray-600 md:hidden dark:text-gray-300">
        <p aria-live="polite">
          Mostrando {numberAR.format(shown)} de {numberAR.format(total)} {itemLabel}
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900 dark:bg-gray-900 dark:text-indigo-300"
          >
            {isLoadingMore && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            {isLoadingMore ? 'Cargando...' : 'Cargar más'}
          </button>
        )}
      </div>
    </>
  )
}
