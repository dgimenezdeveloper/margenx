import '@testing-library/jest-dom'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { supplierService } from '@/services/supplierService'
import SuppliesPageContent from './SuppliesPageContent'
import { renderWithDataRouter } from '@/test-utils/renderWithDataRouter'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token-de-prueba'), signOut: vi.fn() }),
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/insumos' }),
}))

const currentUser: { role: 'ADMIN' | 'COLLABORATOR' } = { role: 'ADMIN' }
vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: currentUser.role, email: 'admin.panaderia@seed.example.test' },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { getAll: vi.fn(), list: vi.fn(), bulkUpload: vi.fn() },
}))
vi.mock('@/services/supplierService', () => ({
  supplierService: { getQuarantine: vi.fn() },
}))

// El modal real lee un Excel; acá alcanza con que avise el resultado de la carga.
vi.mock('./BulkIngredientsModal', () => ({
  BulkIngredientsModal: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: (r: unknown) => void }) =>
    isOpen ? (
      <button type="button" onClick={() => onSuccess({ created: 3, skipped: 0, errors: [] })}>
        Simular carga de 3 insumos
      </button>
    ) : null,
}))

const HARINA: Ingredient = { id: 'ing-1', name: 'Harina de trigo 000 Olavarriense', unit: 'kg', currentCost: 736.25 }
const pagina = <T,>(items: T[]) => ({ items, meta: { total: items.length, page: 1, limit: 20, totalPages: 1 } })
const renderPage = () => renderWithDataRouter(<SuppliesPageContent />, '/insumos')

describe('SuppliesPageContent - "Variaciones recientes" y aviso de planilla (#433, [RV385-I1])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.role = 'ADMIN'
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([HARINA]))
    vi.mocked(ingredientService.getAll).mockResolvedValue([HARINA])
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
  })

  it('Escenario "Colaborador sin tarjeta": un COLLABORATOR no ve "Variaciones recientes"', async () => {
    currentUser.role = 'COLLABORATOR'
    renderPage()

    await screen.findAllByText('Harina de trigo 000 Olavarriense')
    expect(screen.queryByText('Variaciones recientes')).toBeNull()
    expect(supplierService.getQuarantine).not.toHaveBeenCalled()
  })

  it('Escenario "Error de la consulta": la tarjeta dice que no se pudo cargar, no 0, y permite reintentar', async () => {
    vi.mocked(supplierService.getQuarantine).mockRejectedValue(new Error('Failed to fetch'))
    const user = userEvent.setup()
    renderPage()

    const tarjeta = () => within(screen.getByText('Variaciones recientes').parentElement as HTMLElement)
    expect(await tarjeta().findByText('No se pudo cargar')).toBeInTheDocument()
    expect(tarjeta().queryByText('0')).toBeNull()

    vi.mocked(supplierService.getQuarantine).mockResolvedValue([{ id: 'q1' }, { id: 'q2' }] as never)
    await user.click(tarjeta().getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(tarjeta().getByText('2')).toBeInTheDocument())
  })

  it('Escenario "Aviso de planilla": al terminar la carga avisa cuántos insumos se cargaron y recarga la lista', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findAllByText('Harina de trigo 000 Olavarriense')

    await user.click(screen.getAllByRole('button', { name: 'Cargar desde planilla' })[0]!)
    await user.click(await screen.findByRole('button', { name: 'Simular carga de 3 insumos' }))

    expect(await screen.findByText('Se cargaron 3 insumos.')).toBeInTheDocument()
    await waitFor(() => expect(ingredientService.list).toHaveBeenCalledTimes(2))
  })
})
