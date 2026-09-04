'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Boxes, CircleUserRound, LayoutDashboard, Package } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  const tabs = [
    { label: 'Inicio', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Insumos', icon: Boxes, href: '/insumos' },
    { label: 'Productos', icon: Package, href: '/productos' },
    { label: 'Perfil', icon: CircleUserRound, href: '/perfil' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white/95 px-5 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {tabs.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || (href === '/productos' && pathname?.startsWith('/productos/'))
          return (
            <Link
              key={label}
              href={href}
              className={`flex min-w-14 flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
                active ? 'font-bold text-indigo-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}