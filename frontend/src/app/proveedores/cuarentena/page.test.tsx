import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import type { QuarantinedItem } from '@/services/supplierService'
import QuarantinePage from './page'

const fetchItems = vi.fn()
const storeState: { items: QuarantinedItem[]; isLoading: boolean; error: string | null } = {
  items: [],
  isLoading: false,
  error: null,
}

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token'), signOut: vi.fn() }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

vi.mock('@/stores/useQuarantineStore', () => ({
  useQuarantineStore: () => ({ ...storeState, fetchItems, removeItemLocally: vi.fn() }),
}))

const manteca: QuarantinedItem = {
  id: 'q-manteca',
  ingredientId: 'ing-manteca',
  supplierId: 'sup-marjuanc',
  packagePrice: 42000,
  packageSize: 10,
  currentPrice: 42000,
  proposedPrice: 71000,
  quarantineReason: 'VARIACION_MAYOR_50_POR_CIENTO',
  isDefault: true,
  isQuarantined: true,
  ingredient: { id: 'ing-manteca', name: 'Manteca', currentCost: 4200 },
  supplier: { id: 'sup-marjuanc', name: 'Distribuidora MarJuanC Alimentos' },
}

const tabs = () => within(screen.getByRole('navigation', { name: 'Secciones de proveedores' }))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/proveedores/cuarentena']}>
      <QuarantinePage />
    </MemoryRouter>
  )

describe('QuarantinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState.items = [manteca]
    storeState.isLoading = false
    storeState.error = null
  })

  it('queda integrada en Proveedores: pestaña Cuarentena activa y Volver lleva a /proveedores', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/proveedores')
    expect(tabs().getByRole('link', { name: 'Proveedores' })).toHaveAttribute('href', '/proveedores')
    expect(tabs().getByRole('link', { name: 'Cuarentena, 1 precio retenido' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByText('Manteca').length).toBeGreaterThan(0)
    expect(fetchItems).toHaveBeenCalledTimes(1)
  })

  it('no muestra contador en la pestaña mientras carga la bandeja', () => {
    storeState.isLoading = true
    renderPage()

    expect(tabs().getByRole('link', { name: 'Cuarentena' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Cargando bandeja...')).toBeInTheDocument()
  })

  it('con la bandeja vacía muestra el estado vacío dentro de la sección', () => {
    storeState.items = []
    renderPage()

    expect(screen.getByText('Bandeja limpia')).toBeInTheDocument()
    expect(tabs().getByRole('link', { name: 'Cuarentena' })).toBeInTheDocument()
  })
})
