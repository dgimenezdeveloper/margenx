import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { BottomNav } from '@/components/bottom-nav'
import { Navbar } from '@/components/navbar'

const session = vi.hoisted(() => ({ role: 'COLLABORATOR' as 'ADMIN' | 'COLLABORATOR', sales: true }))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: vi.fn(), signOut: vi.fn() }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u-cajera', role: session.role, email: 'cajera.panaderia@seed.example.test', features: { sales: session.sales } },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

const renderMenus = () =>
  render(
    <MemoryRouter initialEntries={['/ventas/nueva']}>
      <Navbar />
      <BottomNav />
    </MemoryRouter>
  )

describe('Menú "Ventas" (ADR-010, #448)', () => {
  beforeEach(() => {
    session.role = 'COLLABORATOR'
    session.sales = true
  })

  it('con el módulo prendido, el colaborador lo ve en los dos menús y queda marcado en /ventas/nueva', () => {
    renderMenus()

    const links = screen.getAllByRole('link', { name: 'Ventas' })
    expect(links).toHaveLength(2)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/ventas'))
    expect(screen.getByTestId('bottom-nav-ventas')).toHaveAttribute('aria-current', 'page')
  })

  it('el administrador también lo ve', () => {
    session.role = 'ADMIN'
    renderMenus()
    expect(screen.getAllByRole('link', { name: 'Ventas' })).toHaveLength(2)
  })

  it('con el módulo apagado no aparece en ningún menú', () => {
    session.sales = false
    renderMenus()
    expect(screen.queryByRole('link', { name: 'Ventas' })).toBeNull()
  })
})
