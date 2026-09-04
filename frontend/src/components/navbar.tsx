'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Boxes,
  Building2,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  Sun
} from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDark(document.documentElement.classList.contains('dark'))
    }
  }, [])
  const toggle = () =>
    setDark((value) => {
      const next = !value
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      aria-label="Cambiar tema"
    >
      {dark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
    </button>
  )
}

export function Navbar({
  title,
  backHref,
  showCompany = true,
  companyName = 'Hamburguesería',
  onLogoClick
}: {
  title?: string
  backHref?: string
  showCompany?: boolean
  companyName?: string
  onLogoClick?: () => void
}) {
  const pathname = usePathname()

  const navLinks = [
    { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Insumos', href: '/insumos', icon: Boxes },
    { label: 'Productos', href: '/productos', icon: Package },
    { label: 'Perfil', href: '/perfil', icon: CircleUserRound }
  ]

  return (
    <header className="relative flex min-h-12 w-full items-center justify-between gap-4 border-b border-gray-100/80 pb-3 md:border-b-0 md:pb-0 dark:border-gray-800">
      <div className="flex min-w-0 items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100"
            aria-label="Volver"
          >
            <ArrowLeft className="size-4" />
          </Link>
        ) : (
          <Link
            href="/dashboard"
            onClick={onLogoClick}
            className="flex shrink-0 items-center gap-2 transition hover:opacity-85 cursor-pointer"
            title="Ir al inicio"
          >
            <img src="/logo-icon.png" alt="MargenX" className="size-8 object-contain dark:brightness-0 dark:invert" />
            <span className="hidden text-base font-black tracking-tight text-indigo-600 dark:text-indigo-400 md:inline-block">
              MargenX
            </span>
          </Link>
        )}

        {title ? (
          <h1 className="truncate text-sm font-bold text-gray-900 dark:text-gray-100 md:text-base">
            {title}
          </h1>
        ) : (
          showCompany && (
            <span className="flex items-center gap-1.5 truncate rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
              <Building2 className="size-3" />
              <span className="truncate max-w-[120px] md:max-w-[200px]">{companyName}</span>
            </span>
          )
        )}
      </div>

      {/* Navegación Desktop */}
      <nav className="hidden items-center gap-1 rounded-2xl border border-gray-200/80 bg-white/80 p-1 shadow-sm backdrop-blur md:flex dark:border-gray-800 dark:bg-gray-900/80">
        {navLinks.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href === '/productos' && pathname?.startsWith('/productos/'))
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/"
          className="hidden items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-600 md:inline-flex dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-rose-950 dark:hover:text-rose-300"
          title="Cerrar sesión"
        >
          <LogOut className="size-3.5" />
          <span>Salir</span>
        </Link>
      </div>
    </header>
  )
}