import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { supplierService } from '@/services/supplierService'
import SuppliesPageContent from './SuppliesPageContent'

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
    user: { id: 'u1', role: 'ADMIN', email: 'admin@panaderia.com' },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { getAll: vi.fn(), create: vi.fn() },
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: { getQuarantine: vi.fn() },
}))

const HARINA: Ingredient = {
  id: 'ing-1',
  name: 'Harina de trigo 000 Olavarriense',
  unit: 'kg',
  currentCost: 736.25,
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/insumos']}>
      <SuppliesPageContent />
    </MemoryRouter>
  )

/** Abre "Nuevo Insumo", carga Manteca por kg y tipea el costo como lo escribe el comercio. */
async function crearMantecaConCosto(costoTipeado: string) {
  const user = userEvent.setup()
  renderPage()

  // Hay un botón para desktop y otro para mobile: abren el mismo formulario.
  const [nuevoInsumo] = await screen.findAllByRole('button', { name: /Nuevo Insumo/i })
  await user.click(nuevoInsumo as HTMLElement)
  await user.type(screen.getByLabelText(/Nombre del insumo/i), 'Manteca La Serenísima')
  const costo = screen.getByLabelText(/Costo unitario/i)
  await user.type(costo, costoTipeado)
  return { user, costo }
}

describe('SuppliesPageContent - costo escrito en es-AR (#359, [RV377-B1])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.getAll).mockResolvedValue([HARINA])
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(ingredientService.create).mockImplementation(async (_getToken, input) => ({
      id: 'ing-2',
      updatedAt: '2026-11-14T00:00:00.000Z',
      ...input,
    }))
  })

  it.each([
    ['1.234,56', 1234.56],
    ['1.250', 1250],
    ['7001,35', 7001.35],
  ])('tipear "%s" muestra lo escrito y envía %d', async (tipeado, enviado) => {
    const { user, costo } = await crearMantecaConCosto(tipeado)

    expect(costo).toHaveValue(tipeado)

    await user.click(screen.getByRole('button', { name: 'Crear Insumo' }))

    await waitFor(() => expect(ingredientService.create).toHaveBeenCalledTimes(1))
    expect(vi.mocked(ingredientService.create).mock.calls[0]?.[1]).toEqual({
      name: 'Manteca La Serenísima',
      unit: 'kg',
      currentCost: enviado,
    })
  })

  it('un costo mal escrito no se envía y avisa en español', async () => {
    const { user } = await crearMantecaConCosto('1.23.4')

    await user.click(screen.getByRole('button', { name: 'Crear Insumo' }))

    expect(await screen.findByText('Escribí el costo con coma decimal, por ejemplo 1.234,56')).toBeInTheDocument()
    expect(ingredientService.create).not.toHaveBeenCalled()
  })
})
