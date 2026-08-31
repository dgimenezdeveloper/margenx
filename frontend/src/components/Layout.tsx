import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/insumos', label: 'Insumos' },
  { to: '/productos', label: 'Productos' },
]

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f5f7f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <NavLink to="/" className="text-xl font-bold tracking-tight text-slate-900" onClick={() => setIsMenuOpen(false)}>
            Mesa<span className="text-orange-500">lista</span>
          </NavLink>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label={isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="block h-0.5 w-6 bg-current" />
            <span className="mt-1.5 block h-0.5 w-6 bg-current" />
            <span className="mt-1.5 block h-0.5 w-6 bg-current" />
          </button>
          <nav className="hidden items-center gap-2 lg:flex" aria-label="Navegacion principal">
            {links.map((link) => <NavigationLink key={link.to} {...link} />)}
            <NavLink to="/login" className="ml-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Iniciar sesion</NavLink>
          </nav>
        </div>
        {isMenuOpen && (
          <nav className="border-t border-slate-100 px-5 py-3 lg:hidden" aria-label="Navegacion movil">
            {links.map((link) => <NavigationLink key={link.to} {...link} onClick={() => setIsMenuOpen(false)} />)}
            <NavLink to="/login" onClick={() => setIsMenuOpen(false)} className="mt-2 block rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white">Iniciar sesion</NavLink>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12"><Outlet /></main>
    </div>
  )
}

function NavigationLink({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  return <NavLink to={to} onClick={onClick} className={({ isActive }) => `block rounded-lg px-4 py-2 text-sm font-semibold ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</NavLink>
}