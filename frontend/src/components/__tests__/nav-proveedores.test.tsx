import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import type { ReactElement } from 'react'

import { BottomNav } from '@/components/bottom-nav'
import { Navbar } from '@/components/navbar'
import { AdminOnlyRoute } from '@/components/admin-only-route'
import { router } from '@/routes'

const session = vi.hoisted(() => ({ role: 'ADMIN' as 'ADMIN' | 'COLLABORATOR' | null, isLoading: false }))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: vi.fn(), signOut: vi.fn() }),
  useClerk: () => ({ signOut: vi.fn() }),
  SignIn: () => null,
}))

vi.mock('@/lib/clerkConfig', () => ({ isClerkConfigured: true, publishableKey: 'pk_test_123' }))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: session.role ? { id: 'u1', role: session.role, email: 'admin.panaderia@seed.example.test' } : null,
    isLoading: session.isLoading,
    businessName: 'Panadería Central',
  }),
}))

const renderAt = (path: string, ui: ReactElement) => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)

describe('Enlace "Proveedores" en la navegación', () => {
  beforeEach(() => {
    session.role = 'ADMIN'
    session.isLoading = false
  })

  it('el administrador lo ve en la barra de escritorio y en el menú inferior', () => {
    renderAt('/dashboard', <><Navbar /><BottomNav /></>)

    const links = screen.getAllByRole('link', { name: 'Proveedores' })
    expect(links).toHaveLength(2)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/proveedores'))
    expect(screen.getByTestId('bottom-nav-proveedores')).toBeInTheDocument()
  })

  it('Escenario Gherkin: el colaborador no ve el enlace en ningún menú', () => {
    session.role = 'COLLABORATOR'
    renderAt('/productos', <><Navbar /><BottomNav /></>)

    expect(screen.queryByRole('link', { name: 'Proveedores' })).toBeNull()
  })

  it('mientras no se conoce el rol, el enlace no aparece', () => {
    session.role = null
    session.isLoading = true
    renderAt('/dashboard', <><Navbar /><BottomNav /></>)

    expect(screen.queryByRole('link', { name: 'Proveedores' })).toBeNull()
  })

  it('queda marcado como página actual en /proveedores y en sus subrutas', () => {
    const { unmount } = renderAt('/proveedores', <BottomNav />)
    expect(screen.getByRole('link', { name: 'Proveedores' })).toHaveAttribute('aria-current', 'page')
    unmount()

    renderAt('/proveedores/cuarentena', <Navbar />)
    const desktopNav = screen.getByRole('navigation')
    expect(within(desktopNav).getByRole('link', { name: 'Proveedores' })).toHaveAttribute('aria-current', 'page')
    expect(within(desktopNav).getByRole('link', { name: 'Insumos' })).not.toHaveAttribute('aria-current')
  })
})

describe('Ruta /proveedores', () => {
  it('existe y está protegida con AdminOnlyRoute', () => {
    const route = router.routes.find((item) => item.path === '/proveedores')
    expect(route).toBeDefined()

    const protectedRoute = route?.element as ReactElement<{ children: ReactElement }>
    expect(protectedRoute.props.children.type).toBe(AdminOnlyRoute)
  })
})
