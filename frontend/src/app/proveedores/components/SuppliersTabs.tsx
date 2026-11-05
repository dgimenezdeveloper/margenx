import Link from 'next/link'
import { ShieldAlert, Truck } from 'lucide-react'

export type SuppliersTab = 'suppliers' | 'quarantine'

interface SuppliersTabsProps {
  active: SuppliersTab
  /** Precios retenidos; si todavía no se conoce, la pestaña va sin contador. */
  quarantineCount?: number
}

const baseClass =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition md:flex-none'
const activeClass = 'bg-white text-indigo-700 shadow-sm dark:bg-gray-800 dark:text-indigo-300'
const idleClass = 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'

/** Pestañas de la sección Proveedores: la lista y la bandeja de cuarentena viven en el mismo lugar. */
export function SuppliersTabs({ active, quarantineCount }: SuppliersTabsProps) {
  const hasPending = quarantineCount !== undefined && quarantineCount > 0
  // El número del distintivo se anuncia con palabras: no alcanza con el color ni con la cifra suelta.
  const quarantineLabel = !hasPending
    ? undefined
    : quarantineCount === 1
      ? 'Cuarentena, 1 precio retenido'
      : `Cuarentena, ${quarantineCount} precios retenidos`

  return (
    <nav
      aria-label="Secciones de proveedores"
      className="flex w-full gap-1 rounded-2xl bg-gray-100 p-1 md:w-fit dark:bg-gray-900"
    >
      <Link
        href="/proveedores"
        aria-current={active === 'suppliers' ? 'page' : undefined}
        className={`${baseClass} ${active === 'suppliers' ? activeClass : idleClass}`}
      >
        <Truck className="size-4" aria-hidden="true" />
        Proveedores
      </Link>
      <Link
        href="/proveedores/cuarentena"
        aria-label={quarantineLabel}
        aria-current={active === 'quarantine' ? 'page' : undefined}
        className={`${baseClass} ${active === 'quarantine' ? activeClass : idleClass}`}
      >
        <ShieldAlert className="size-4" aria-hidden="true" />
        Cuarentena
        {hasPending && (
          <span
            aria-hidden="true"
            className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-black text-amber-950"
          >
            {quarantineCount}
          </span>
        )}
      </Link>
    </nav>
  )
}
