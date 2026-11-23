'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Boxes, CircleUserRound, LayoutDashboard, Package, Receipt, ShoppingCart, Truck } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { useFeatures } from '@/hooks/useFeatures'
import { isNavLinkActive, isNavLinkVisible } from '@/lib/navigation'

export function BottomNav() {
  const pathname = usePathname()
  const role = useUserRole()
  const { features } = useFeatures()

  const tabs = [
    { label: 'Inicio', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Insumos', icon: Boxes, href: '/insumos' },
    { label: 'Productos', icon: Package, href: '/productos' },
    { label: 'Ventas', icon: Receipt, href: '/ventas' },
    { label: 'Proveedores', icon: Truck, href: '/proveedores' },
    { label: 'Compras', icon: ShoppingCart, href: '/compras' },
    { label: 'Perfil', icon: CircleUserRound, href: '/perfil' },
  ].filter(tab => isNavLinkVisible(tab.href, role, features))

  // El alto vertical (pt-2.5, ícono size-5, gap-1 y etiqueta de 10 px) es el que supone
  // ABOVE_BOTTOM_NAV_CLASS (lib/mobile-layout.ts) para apoyar las barras fijas sobre esta barra.
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white/95 px-2.5 sm:px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-900/95 print:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-0.5">
        {tabs.map(({ label, icon: Icon, href }) => {
          const active = isNavLinkActive(pathname, href)
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? 'page' : undefined}
              data-testid={`bottom-nav-${href.replace('/', '')}`}
              className={`flex flex-1 min-w-0 flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
                active ? 'font-bold text-indigo-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="size-5 shrink-0" />
              <span className="truncate max-w-full text-center">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}