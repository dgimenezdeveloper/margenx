import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { Navbar } from '@/components/navbar'

// Hallazgo 254 de la recorrida del 26/11 (#505): en la barra de escritorio el nombre del comercio se corta con "…"
// (truncate, 200 px desde md) y no había forma de leerlo completo.
const comercio = vi.hoisted(() => ({ nombre: 'Panadería y Confitería Central de Olavarría' }))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: vi.fn(), signOut: vi.fn() }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u-admin', role: 'ADMIN', email: 'admin.panaderia@seed.example.test', features: { sales: true } },
    isLoading: false,
    businessName: comercio.nombre,
  }),
}))

function renderBarra(props: Parameters<typeof Navbar>[0] = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Navbar {...props} />
    </MemoryRouter>
  )
}

describe('Barra: nombre del comercio cortado (#505)', () => {
  beforeEach(() => {
    comercio.nombre = 'Panadería y Confitería Central de Olavarría'
  })

  it('Escenario "Nombre largo del comercio": al pasar el mouse se ve el nombre completo', () => {
    renderBarra()

    const nombre = screen.getByText(comercio.nombre)
    expect(nombre).toHaveClass('truncate')
    expect(nombre).toHaveAttribute('title', comercio.nombre)
  })

  it('el lector de pantalla lee el nombre completo: el corte es solo visual (CSS)', () => {
    renderBarra()

    expect(screen.getByText(comercio.nombre).textContent).toBe(comercio.nombre)
  })

  it('también con el título de la pantalla, en el chip que se ve desde escritorio', () => {
    renderBarra({ title: 'Ventas', titleMobileOnly: true })

    expect(screen.getByText(comercio.nombre)).toHaveAttribute('title', comercio.nombre)
  })

  it('Escenario "Nombre corto": "Demo MargenX" se ve entero, igual que antes', () => {
    comercio.nombre = 'Demo MargenX'
    renderBarra()

    expect(screen.getByText('Demo MargenX')).toHaveAttribute('title', 'Demo MargenX')
  })
})
