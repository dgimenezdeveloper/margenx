import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  it('la barra de escritorio y el panel del menú del celular lo nombran "Impacto en el margen" y van a /compras', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/compras']}>
        <Navbar />
        <BottomNav />
      </MemoryRouter>
    )

    const desktop = screen.getByRole('link', { name: 'Impacto en el margen' })
    expect(desktop).toHaveAttribute('href', '/compras')
    expect(screen.queryByRole('link', { name: 'Compras' })).toBeNull()

    // A 360 px queda en el panel de "Más" (#437), que se marca mientras se está en /compras.
    expect(screen.queryByTestId('bottom-nav-compras')).toBeNull()
    expect(screen.getByTestId('bottom-nav-mas')).toHaveClass('text-indigo-600')
    await user.click(screen.getByTestId('bottom-nav-mas'))
    const enlace = within(await screen.findByRole('dialog', { name: 'Menú' })).getByRole('link', { name: 'Impacto en el margen' })
    expect(enlace).toHaveAttribute('href', '/compras')
    expect(enlace).toHaveAttribute('aria-current', 'page')
  })

  it('en la barra de escritorio muestra "Impacto" y ningún enlace parte su texto en varias líneas', () => {
    render(
      <MemoryRouter initialEntries={['/compras']}>
        <Navbar />
      </MemoryRouter>
    )

    // A 1280 px el nombre completo se partía en tres líneas: el texto visible es corto y el completo queda en aria-label y title.
    const link = screen.getByRole('link', { name: 'Impacto en el margen' })
    expect(link).toHaveTextContent(/^Impacto$/)
    expect(link).toHaveAttribute('title', 'Impacto en el margen')
    const navLinks = screen.getAllByRole('link').filter((l) => l.closest('nav'))
    navLinks.forEach((l) => expect(l).toHaveClass('whitespace-nowrap'))
    // Entre 768 y 1023 px solo se ve el ícono: el texto sigue en el DOM para lectores de pantalla y como tooltip.
    navLinks.forEach((l) => {
      expect(l.querySelector('span')).toHaveClass('sr-only', 'lg:not-sr-only')
      expect(l).toHaveAttribute('title')
    })
    expect(screen.getByRole('link', { name: 'Proveedores' })).toHaveAttribute('title', 'Proveedores')
  })
})
