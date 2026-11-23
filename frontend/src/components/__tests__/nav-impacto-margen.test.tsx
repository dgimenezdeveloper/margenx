import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { BottomNav } from '@/components/bottom-nav'
import { Navbar } from '@/components/navbar'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: vi.fn(), signOut: vi.fn() }),
  useClerk: () => ({ signOut: vi.fn() }),
  SignIn: () => null,
}))

vi.mock('@/lib/clerkConfig', () => ({ isClerkConfigured: true, publishableKey: 'pk_test_123' }))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

describe('Enlace "Impacto en el margen" en la navegación (#446)', () => {
  it('la barra de escritorio y el menú inferior lo nombran "Impacto en el margen" y siguen yendo a /compras', () => {
    render(
      <MemoryRouter initialEntries={['/compras']}>
        <Navbar />
        <BottomNav />
      </MemoryRouter>
    )

    const links = screen.getAllByRole('link', { name: 'Impacto en el margen' })
    expect(links).toHaveLength(2)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/compras'))
    expect(screen.queryByRole('link', { name: 'Compras' })).toBeNull()

    // A 360 px el menú inferior tiene siete pestañas: muestra "Impacto" y el nombre completo queda en aria-label.
    const tab = screen.getByTestId('bottom-nav-compras')
    expect(tab).toHaveTextContent(/^Impacto$/)
    expect(tab).toHaveAttribute('aria-current', 'page')
  })
})
