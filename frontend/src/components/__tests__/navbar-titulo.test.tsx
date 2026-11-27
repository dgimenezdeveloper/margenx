import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { Navbar } from '@/components/navbar'

// Contrato que usan las pruebas de páginas con la barra simulada (por ejemplo app/ventas/__tests__/titulos.test.tsx, #502):
// el título de la barra es el encabezado de nivel 1 de la pantalla, y sin título la barra no dibuja ningún encabezado.
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: vi.fn(), signOut: vi.fn() }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test', features: { sales: true } },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

describe('Barra: título y encabezado de nivel 1 (#502)', () => {
  it('con título, lo dibuja como el único encabezado de nivel 1', () => {
    render(
      <MemoryRouter initialEntries={['/ventas/turnos']}>
        <Navbar title="Turnos de caja" backHref="/ventas" />
      </MemoryRouter>
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toEqual([screen.getByRole('heading', { name: 'Turnos de caja' })])
  })

  it('sin título, no dibuja ningún encabezado y muestra el nombre del comercio', () => {
    render(
      <MemoryRouter initialEntries={['/ventas']}>
        <Navbar />
      </MemoryRouter>
    )

    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByText('Panadería Central')).toBeInTheDocument()
  })
})
