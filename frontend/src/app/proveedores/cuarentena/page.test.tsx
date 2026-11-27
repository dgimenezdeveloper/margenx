import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

// QuarantineList es el real: el aviso se dispara con el flujo de rechazo completo.
vi.mock('@/services/supplierService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/supplierService')>()
  return {
    ...actual,
    supplierService: { ...actual.supplierService, rejectQuarantine: vi.fn().mockResolvedValue(undefined) },
  }
})

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

  it('C4: queda integrada en Proveedores sin botón Volver duplicado (se vuelve con la pestaña)', () => {
    renderPage()

    expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument()
    expect(screen.queryByText(/cuarentena de precios/i)).not.toBeInTheDocument()
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

  it('si falla la carga muestra el error, sin contador ni estado vacío, y Reintentar vuelve a pedir la bandeja', () => {
    storeState.items = []
    storeState.error = 'No se pudieron cargar los precios en cuarentena.'
    renderPage()

    expect(screen.getByText('Error al cargar la cuarentena')).toBeInTheDocument()
    expect(screen.getByText('No se pudieron cargar los precios en cuarentena.')).toBeInTheDocument()
    expect(screen.queryByText('Bandeja limpia')).not.toBeInTheDocument()
    expect(tabs().getByRole('link', { name: 'Cuarentena' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(fetchItems).toHaveBeenCalledTimes(2)
  })

  describe('aviso de confirmación', () => {
    const rechazarManteca = async () => {
      renderPage()
      fireEvent.click(screen.getAllByText('Rechazar')[0])
      fireEvent.click(screen.getByRole('button', { name: /sí, rechazar/i }))
      return screen.findByText('Precio rechazado. Se mantiene el costo anterior.')
    }

    it('se cierra con el botón de cerrar', async () => {
      await rechazarManteca()

      fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

      await waitFor(() => {
        expect(screen.queryByText('Precio rechazado. Se mantiene el costo anterior.')).not.toBeInTheDocument()
      })
    })

    it('se cierra deslizándolo hacia el costado', async () => {
      const mensaje = await rechazarManteca()
      const aviso = mensaje.closest('.fixed') as HTMLElement

      fireEvent.touchStart(aviso, { touches: [{ clientX: 40 }] })
      fireEvent.touchMove(aviso, { touches: [{ clientX: 200 }] })
      fireEvent.touchEnd(aviso)

      await waitFor(() => {
        expect(screen.queryByText('Precio rechazado. Se mantiene el costo anterior.')).not.toBeInTheDocument()
      })
    })
  })
})
