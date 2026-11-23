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
vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN', email: 'admin.panaderia@seed.example.test' },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))
vi.mock('@/services/ingredientService', () => ({
  ingredientService: { getAll: vi.fn(), list: vi.fn(), getProducts: vi.fn() },
}))
vi.mock('@/services/supplierService', () => ({
  supplierService: { getQuarantine: vi.fn(), addPackaging: vi.fn() },
}))

/* Harina con dos presentaciones: la predeterminada de MarJuanC y otra más barata de Molinera. */
const HARINA: Ingredient = {
  id: 'ing-harina',
  name: 'Harina de trigo 000 Olavarriense',
  unit: 'kg',
  currentCost: 736.25,
  supplierConnections: [
    { id: 'si-marjuanc', supplierId: 'sup-marjuanc', ingredientId: 'ing-harina', packageSize: 25, packageUnit: 'kg', packagePrice: 18406.25, isDefault: true, isQuarantined: false, supplier: { id: 'sup-marjuanc', name: 'Distribuidora MarJuanC Alimentos' } },
    { id: 'si-molinera', supplierId: 'sup-molinera', ingredientId: 'ing-harina', packageSize: 25, packageUnit: 'kg', packagePrice: 17812.5, isDefault: false, isQuarantined: false, supplier: { id: 'sup-molinera', name: 'Distribuidora Mayorista Molinera' } },
  ],
}
const pagina = <T,>(items: T[]) => ({ items, meta: { total: items.length, page: 1, limit: 20, totalPages: 1 } })

describe('Insumos - Escenario "Confirmación desde el insumo" (#434)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([HARINA]))
    vi.mocked(ingredientService.getProducts).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } })
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(supplierService.addPackaging).mockResolvedValue({ supplierIngredient: HARINA.supplierConnections![1]!, unitCost: 712.5 } as never)
  })

  it('tocar la estrella de la que no es predeterminada pide confirmación antes de cambiar el costo', async () => {
    const user = userEvent.setup()
    renderWithDataRouter(<SuppliesPageContent />, '/insumos')

    const [fila] = await screen.findAllByText('Harina de trigo 000 Olavarriense')
    await user.click(fila!)
    await user.click(await screen.findByRole('button', { name: 'Usar como predeterminada la presentación de Distribuidora Mayorista Molinera' }))

    const dialog = await screen.findByRole('dialog', { name: '¿Cambiar la presentación predeterminada?' })
    expect(supplierService.addPackaging).not.toHaveBeenCalled()
    expect(dialog).toHaveTextContent('reemplaza a Distribuidora MarJuanC Alimentos')
    expect(dialog).toHaveTextContent('$712,50 por kg')

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar cambio' }))
    await waitFor(() =>
      expect(supplierService.addPackaging).toHaveBeenCalledWith(
        expect.any(Function),
        'sup-molinera',
        expect.objectContaining({ ingredientId: 'ing-harina', isDefault: true })
      )
    )
  })

  it('cancelar no cambia nada', async () => {
    const user = userEvent.setup()
    renderWithDataRouter(<SuppliesPageContent />, '/insumos')

    const [fila] = await screen.findAllByText('Harina de trigo 000 Olavarriense')
    await user.click(fila!)
    await user.click(await screen.findByRole('button', { name: /Usar como predeterminada la presentación de Distribuidora Mayorista Molinera/ }))
    await user.click(within(await screen.findByRole('dialog', { name: '¿Cambiar la presentación predeterminada?' })).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Cambiar la presentación predeterminada?' })).toBeNull())
    expect(supplierService.addPackaging).not.toHaveBeenCalled()
  })
})
