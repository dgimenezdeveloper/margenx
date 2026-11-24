'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Boxes, CircleUserRound, LayoutDashboard, Menu, Package, Receipt, TrendingUp, Truck } from 'lucide-react'
import { MobileMenu, type MobileMenuLink } from '@/components/mobile-menu'
import { useUserRole } from '@/hooks/useUserRole'
import { useFeatures } from '@/hooks/useFeatures'
import { isNavLinkActive, isNavLinkVisible, splitMobileNav } from '@/lib/navigation'

/** Todos los destinos del celular, en el orden del panel. El menú inferior toma los primeros (splitMobileNav). */
const DESTINATIONS: MobileMenuLink[] = [
  { label: 'Inicio', icon: LayoutDashboard, href: '/dashboard', group: 'negocio' },
  { label: 'Productos', icon: Package, href: '/productos', group: 'negocio' },
  { label: 'Insumos', icon: Boxes, href: '/insumos', group: 'negocio' },
  { label: 'Ventas', icon: Receipt, href: '/ventas', group: 'negocio' },
  { label: 'Proveedores', icon: Truck, href: '/proveedores', group: 'compras' },
  { label: 'Impacto en el margen', icon: TrendingUp, href: '/compras', group: 'compras' },
  { label: 'Perfil', icon: CircleUserRound, href: '/perfil', group: 'cuenta' },
]

const TAB_CLASSES = 'flex flex-1 min-w-0 flex-col items-center gap-1 text-[10px] font-medium transition-colors'
const ACTIVE_CLASSES = 'font-bold text-indigo-600 dark:text-indigo-400'
const INACTIVE_CLASSES = 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'

/**
 * Menú inferior del celular (#437). Hasta 4 pantallas entran como pestañas con el rótulo completo; con
 * más (el ADMIN), quedan 4 fijas y "Más", que abre el panel lateral con todas. El panel también se abre
 * arrastrando el dedo hacia la derecha (MobileMenu). Desde 768 px no se muestra: manda la barra de arriba.
 */
export function BottomNav() {
  const pathname = usePathname()
  const role = useUserRole()
  const { features } = useFeatures()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const visible = DESTINATIONS.filter((destination) => isNavLinkVisible(destination.href, role, features))
  const { tabs, more } = splitMobileNav(visible.map((destination) => destination.href))
  const tabDestinations = tabs.map((href) => visible.find((destination) => destination.href === href)!)
  const isMoreActive = more.some((href) => isNavLinkActive(pathname, href))

  // El alto vertical (pt-2.5, ícono size-5, gap-1 y etiqueta de 10 px) es el que supone
  // ABOVE_BOTTOM_NAV_CLASS (lib/mobile-layout.ts) para apoyar las barras fijas sobre esta barra.
  return (
    <>
      <nav
        aria-label="Menú inferior"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white/95 px-2.5 sm:px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-900/95 print:hidden"
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-0.5">
          {tabDestinations.map(({ label, icon: Icon, href }) => {
            const active = isNavLinkActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                data-testid={`bottom-nav-${href.replace('/', '')}`}
                className={`${TAB_CLASSES} ${active ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate max-w-full text-center">{label}</span>
              </Link>
            )
          })}
          {more.length > 0 && (
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              data-testid="bottom-nav-mas"
              data-active={isMoreActive ? 'true' : undefined}
              className={`${TAB_CLASSES} cursor-pointer ${isMoreActive ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
            >
              <Menu className="size-5 shrink-0" />
              <span className="truncate max-w-full text-center">Más</span>
            </button>
          )}
        </div>
      </nav>
      <MobileMenu open={isMenuOpen} onOpenChange={setIsMenuOpen} links={visible} pathname={pathname} />
    </>
  )
}
